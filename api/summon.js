// Serverless proxy for the Critter Vale "Summon Lab".
// Holds MAGICA_KEY server-side so the browser never sees it. Image generation
// takes far longer than a serverless request may run, so this is a small state
// machine the client orchestrates by polling (start -> poll -> bg-remove -> poll).
//
// Requests (same origin):
//   POST { op:"gen", description, element }  -> { runId }        (starts image gen)
//   GET  ?runId=<id>                         -> { status, result }  (poll a run)
//   POST { op:"bg", imageUrl }               -> { runId }        (starts bg removal)
//
// status is "pending" | "done" | "failed"; result is the Magica output URL array.

const BASE = "https://api.magica.com/api/v1";
const DONE_EXCLUDES = new Set(["RUNNING", "PENDING", "QUEUED"]);
const ELEMENTS = new Set(["Ember", "Aqua", "Leaf"]);

const STYLE =
  "original creature-collector monster mascot, chibi proportions, single full-body character centered, " +
  "expressive friendly eyes, painterly HD-2D video game sprite, vibrant saturated colors, soft rim light, " +
  "clean flat solid light-gray studio background, no text, no words, no border, no shadow on ground";

// Best-effort in-memory throttle (resets on cold start; NOT a hard guarantee).
// A public endpoint calling a paid API should get a real limiter (e.g. Upstash)
// if it ever sees traffic. See the follow-up note in the project memory.
const HITS = new Map(); // ip -> number[] (timestamps ms)
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;

function throttled(ip) {
  const now = Date.now();
  const arr = (HITS.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) return true;
  arr.push(now);
  HITS.set(ip, arr);
  return false;
}

function magicaHeaders(key) {
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
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
      if (!runId || typeof runId !== "string") {
        res.status(400).json({ error: "missing runId" });
        return;
      }
      const r = await fetch(`${BASE}/nodes/runs/${runId}`, { headers: magicaHeaders(key) });
      if (!r.ok) throw new Error(`getRun ${r.status}`);
      const run = await r.json();
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

      if (body.op === "gen") {
        const ip = (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || "anon";
        if (throttled(ip)) {
          res.status(429).json({ error: "Slow down a moment, then try summoning again." });
          return;
        }
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
        const imageUrl = String(body.imageUrl ?? "");
        if (!/^https:\/\//.test(imageUrl)) {
          res.status(400).json({ error: "bad imageUrl" });
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
