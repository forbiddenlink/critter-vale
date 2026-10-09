// Serverless proxy for the Critter Vale "Summon Lab".
// Holds MAGICA_KEY server-side so the browser never sees it. Image generation
// takes far longer than a serverless request may run, so this is a small state
// machine the client orchestrates by polling (start -> poll -> bg-remove -> poll).
//
// Requests (same origin):
//   POST { op:"gen", description, element }  -> { runId }        (starts image gen)
//   GET  ?runId=<id>                         -> { status, result }  (poll a run)
//   POST { op:"bg", runId }                  -> { runId }        (bg removal on that gen's image)
//
// status is "pending" | "done" | "failed"; result is the Magica output URL array.

import { createGuard, RUN_ID, sameOrigin } from "./_guard.js";

const BASE = "https://api.magica.com/api/v1";
const DONE_EXCLUDES = new Set(["RUNNING", "PENDING", "QUEUED"]);
const ELEMENTS = new Set(["Ember", "Aqua", "Leaf"]);

const STYLE =
  "original creature-collector monster mascot, chibi proportions, single full-body character centered, " +
  "expressive friendly eyes, painterly HD-2D video game sprite, vibrant saturated colors, soft rim light, " +
  "clean flat solid light-gray studio background, no text, no words, no border, no shadow on ground";

// Paid runs are guarded by a per-IP throttle, a daily budget and a same-origin check, and
// background removal only ever runs on an image this endpoint generated. See ./_guard.js.
const guard = createGuard({
  perMinute: 6,
  dailyCap: Number(process.env.SUMMON_DAILY_CAP) || 50,
});

function magicaHeaders(key) {
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function getRun(key, runId) {
  const r = await fetch(`${BASE}/nodes/runs/${encodeURIComponent(runId)}`, { headers: magicaHeaders(key) });
  if (!r.ok) throw new Error(`getRun ${r.status}`);
  return r.json();
}

async function startRun(key, nodeType, input) {
  const res = await fetch(`${BASE}/nodes/${nodeType}/run`, {
    method: "POST",
    headers: magicaHeaders(key),
    body: JSON.stringify({ input }),
  });
  if (res.status !== 202 && !res.ok) throw new Error(`run start ${res.status}`);
  const { runId } = await res.json();
  if (!runId) throw new Error("no runId");
  return runId;
}

export default async function handler(req, res) {
  const key = process.env.MAGICA_KEY;
  if (!key) {
    res.status(500).json({ error: "Summoning is not configured on this deploy." });
    return;
  }

  try {
    if (req.method === "GET") {
      const runId = req.query.runId;
      // Strict allowlist: runIds are UUID-shaped. Reject anything else so a crafted
      // value can't path-traverse to other authenticated Magica endpoints via our key.
      if (typeof runId !== "string" || !RUN_ID.test(runId)) {
        res.status(400).json({ error: "bad runId" });
        return;
      }
      const run = await getRun(key, runId);
      if (DONE_EXCLUDES.has(run.status)) {
        res.status(200).json({ status: "pending" });
      } else if (run.status === "FAILED" || run.error) {
        res.status(200).json({ status: "failed" });
      } else {
        res.status(200).json({ status: "done", result: run.output?.result ?? [] });
      }
      return;
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      if (!sameOrigin(req.headers)) {
        res.status(403).json({ error: "forbidden" });
        return;
      }
      const ip = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || "anon";
      if (guard.throttled(ip)) {
        res.status(429).json({ error: "Slow down a moment, then try summoning again." });
        return;
      }

      if (body.op === "gen") {
        const description = String(body.description ?? "").trim();
        const element = String(body.element ?? "");
        if (description.length < 3 || description.length > 200) {
          res.status(400).json({ error: "Describe your critter in 3 to 200 characters." });
          return;
        }
        if (!ELEMENTS.has(element)) {
          res.status(400).json({ error: "Pick an element: Ember, Aqua, or Leaf." });
          return;
        }
        if (!guard.takeBudget()) {
          res.status(503).json({ error: "The Wellspring is resting for today. Try again tomorrow." });
          return;
        }
        const flavor = element === "Ember" ? "fiery" : element === "Aqua" ? "aquatic" : "leafy plant";
        const prompt = `a ${flavor} creature: ${description}. ${STYLE}`;
        const runId = await startRun(key, "gpt_image_2", {
          prompt,
          image_size: "1:1",
          output_format: "PNG",
          num_images: 1,
        });
        res.status(200).json({ runId });
        return;
      }

      if (body.op === "bg") {
        // Take the image from our own finished gen run instead of a client-supplied URL, so
        // this cannot be used as a free background remover for arbitrary images.
        const genRunId = body.runId;
        if (typeof genRunId !== "string" || !RUN_ID.test(genRunId)) {
          res.status(400).json({ error: "bad runId" });
          return;
        }
        const gen = await getRun(key, genRunId);
        const imageUrl = gen.output?.result?.[0];
        if (DONE_EXCLUDES.has(gen.status) || gen.status === "FAILED" || typeof imageUrl !== "string") {
          res.status(409).json({ error: "That summon has no finished image yet." });
          return;
        }
        if (!guard.claimGenRun(genRunId)) {
          res.status(409).json({ error: "That image was already cleaned up." });
          return;
        }
        if (!guard.takeBudget()) {
          res.status(503).json({ error: "The Wellspring is resting for today. Try again tomorrow." });
          return;
        }
        const runId = await startRun(key, "background_remover", { image_url: imageUrl });
        res.status(200).json({ runId });
        return;
      }

      res.status(400).json({ error: "unknown op" });
      return;
    }

    res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    res.status(502).json({ error: "The summoning failed. Try again." });
  }
}
