// One-off build script: generates the audio pack with Magica, downloads every asset into
// public/audio/ (CDN URLs are never stored) and transcodes with ffmpeg.
// Usage: MAGICA_KEY=... node scripts/generate-audio.mjs [name ...]   (needs ffmpeg on PATH)
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://api.magica.com/api/v1";
const KEY = process.env.MAGICA_KEY;
if (!KEY) throw new Error("MAGICA_KEY missing");
const OUT = new URL("../public/audio/", import.meta.url).pathname;
const TMP = join(process.env.TMPDIR || "/tmp", "critter-audio-raw");
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const sfx = (prompt, duration) => ({ model: "cassette_ai_sfx", input: { prompt, duration }, kind: "sfx" });
const music = (prompt) => ({ model: "lyria_3_5", input: { prompt }, kind: "music" });

const PACK = {
  "hit-ember": sfx("short fiery impact hit, crackling flame whoosh burst, retro RPG battle attack, no music", 1),
  "hit-aqua": sfx("short watery splash impact hit, bubbly water burst, retro RPG battle attack, no music", 1),
  "hit-leaf": sfx("short leafy slash impact hit, rustling whip of leaves, retro RPG battle attack, no music", 1),
  "hit-normal": sfx("short punchy physical thump hit, simple tackle impact, retro RPG battle attack, no music", 1),
  "ui-click": sfx("single soft wooden UI tap, dry, no reverb, 0.1 seconds, no music", 1),
  "ui-confirm": sfx("bright cheerful UI confirm chime, two quick rising notes, game menu, no music", 1),
  "ui-cancel": sfx("soft low UI cancel back blip, two quick falling notes, game menu, no music", 1),
  "summon-shimmer": sfx("magical shimmering sparkle swell, glittering chimes rising, mystical creature summoning, no music", 3),
  "bgm-battle": music("instrumental only, no vocals, upbeat energetic creature-collector RPG battle theme, driving chiptune-meets-orchestral, tense but fun, seamless loop, 150 bpm"),
  "bgm-town": music("instrumental only, no vocals, warm cozy village overworld theme for a creature-collecting RPG, gentle acoustic guitar, flute and light percussion, relaxed and adventurous, seamless loop, 100 bpm"),
};

const H = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function run(model, input) {
  const r = await fetch(`${BASE}/nodes/${model}/run`, { method: "POST", headers: H, body: JSON.stringify({ input }) });
  if (!r.ok && r.status !== 202) throw new Error(`start ${model} ${r.status}`);
  const { runId } = await r.json();
  for (let i = 0; i < 90; i++) {
    await new Promise((res) => setTimeout(res, 4000));
    const g = await (await fetch(`${BASE}/nodes/runs/${runId}`, { headers: H })).json();
    if (["RUNNING", "PENDING", "QUEUED"].includes(g.status)) continue;
    if (g.status === "FAILED" || g.error) throw new Error(`run failed: ${model}`);
    return { url: g.output?.result?.[0], credits: g.creditUsed };
  }
  throw new Error("timeout");
}

const probeDuration = (f) =>
  Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());

const START_TRIM = "silenceremove=start_periods=1:start_threshold=-45dB";

/** Per-sound clean-up chain (applied before normalisation). */
function chainFor(name, tmpWav) {
  if (name.startsWith("ui-")) {
    // UI sounds are one short transient: drop leading silence, keep <=250ms, 15ms fade-out.
    return [START_TRIM, "atrim=0:0.25", "afade=t=out:st=0.235:d=0.015"];
  }
  const chain = [START_TRIM];
  if (name === "hit-ember" || name === "summon-shimmer") chain.push("highshelf=f=6000:g=-4");
  if (name === "summon-shimmer") {
    const d = probeDuration(tmpWav);
    chain.push(`afade=t=out:st=${Math.max(0, d - 0.15).toFixed(3)}:d=0.15`);
  }
  return chain;
}

function encodeSfx(name, raw, dest) {
  const full = join(TMP, `${name}.full.wav`);
  const cut = join(TMP, `${name}.cut.wav`);
  const run = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);
  run(["-i", raw, "-ac", "1", "-ar", "22050", full]); // untrimmed: durations are measured from this
  run(["-i", full, "-af", chainFor(name, full).join(","), cut]);
  const src = probeDuration(cut) < 0.05 ? full : cut; // trimming ate a very quiet blip: keep it whole
  // Peak-normalise to -3dBFS so no effect jumps out.
  const vd = spawnSync("ffmpeg", ["-hide_banner", "-i", src, "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(vd.stderr)?.[1]);
  const gain = Number.isFinite(peak) ? -3 - peak : 0;
  run(["-i", src, "-af", `volume=${gain.toFixed(2)}dB`, "-b:a", "64k", dest]);
  rmSync(full);
  rmSync(cut);
}

const wanted = process.argv.slice(2);
let credits = 0;
for (const [name, spec] of Object.entries(PACK)) {
  if (wanted.length && !wanted.includes(name)) continue;
  console.log("generating", name);
  const { url, credits: c } = await run(spec.model, spec.input);
  credits += c ?? 0;
  if (!url) throw new Error(`no output for ${name}`);
  const raw = join(TMP, `${name}.bin`);
  writeFileSync(raw, Buffer.from(await (await fetch(url)).arrayBuffer()));
  const dest = join(OUT, `${name}.${spec.kind === "music" ? "m4a" : "mp3"}`);
  // Music: full-length AAC 64k stereo (~1.4MB for 3 minutes); src/audio.ts crossfades the tail into
  // the head at runtime for a gapless loop. SFX: cleaned up, peak-normalised to -3dBFS, mono mp3.
  if (spec.kind === "music") {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-c:a", "aac", "-ac", "2", "-ar", "44100", "-b:a", "64k", dest]);
  } else {
    encodeSfx(name, raw, dest);
  }
  rmSync(raw);
  if (!existsSync(dest)) throw new Error(`transcode failed: ${name}`);
}
console.log("credits used:", credits);
