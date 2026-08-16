// Shared client for the /api/summon proxy. Both the Summon Lab and Wellspring Fusion
// use this: start a gen, poll it, background-remove, poll again, return the final URL.
import type { Element } from "../game/critters";

async function startOp(body: Record<string, unknown>): Promise<string> {
  const r = await fetch("/api/summon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? "request failed");
  return data.runId;
}

async function poll(runId: string, cancelled: () => boolean, timeoutMs = 180_000): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (cancelled()) throw new Error("cancelled");
    const r = await fetch(`/api/summon?runId=${encodeURIComponent(runId)}`);
    const d = await r.json();
    if (d.status === "done") return d.result ?? [];
    if (d.status === "failed") throw new Error("generation failed");
    if (Date.now() > deadline) throw new Error("timed out");
    await new Promise((res) => setTimeout(res, 3000));
  }
}

/** Generate a critter image (gen -> poll -> bg-remove -> poll). Returns the final image URL. */
export async function generateCritter(
  description: string,
  element: Element,
  cancelled: () => boolean = () => false
): Promise<string> {
  const genRun = await startOp({ op: "gen", description, element });
  const [raw] = await poll(genRun, cancelled);
  if (!raw) throw new Error("no image");
  const bgRun = await startOp({ op: "bg", imageUrl: raw });
  const [clean] = await poll(bgRun, cancelled);
  return clean ?? raw;
}
