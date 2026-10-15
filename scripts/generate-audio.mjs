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
const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);
const stderrOf = (args) => spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8" }).stderr;

/** Per-sound clean-up applied after trimming, before loudness matching. `d` is the trimmed length. */
function eqChain(name, d) {
  const fadeOut = (sec, curve = "tri") => `afade=t=out:st=${Math.max(0, d - sec).toFixed(3)}:d=${sec}:curve=${curve}`;
  switch (name) {
    case "ui-click":
    case "ui-cancel":
      return ["afade=t=out:st=0.235:d=0.015"];
    case "ui-confirm":
      return ["equalizer=f=3000:t=q:w=2:g=-4", "afade=t=out:st=0.235:d=0.015"]; // tame the harsh ~3kHz peak
    case "hit-ember":
      return ["highshelf=f=6000:g=-4", fadeOut(0.15, "exp")]; // natural, not abrupt, tail
    case "hit-leaf":
      return ["highpass=f=150", "highshelf=f=5000:g=-6", fadeOut(0.12)]; // cut tail hiss
    case "summon-shimmer":
      return ["highshelf=f=6000:g=-4", fadeOut(0.15)];
    default:
      return [];
  }
}

/** Loudness targets. Hits and shimmer use two-pass EBU R128 loudnorm (true peak -1dBTP); UI sounds
 *  are too short for integrated-LUFS gating, so they are matched by RMS (hits are ~6dB louder). */
const LUFS = { "summon-shimmer": -18 };
const HIT_LUFS = -16;
const UI_RMS_DB = -22;

function loudnessFilter(name, wav) {
  if (name.startsWith("ui-")) {
    const rms = Number(/RMS level dB: (-?[\d.]+)/.exec(stderrOf(["-i", wav, "-af", "astats=measure_overall=RMS_level", "-f", "null", "-"]))?.[1]);
    const gain = Number.isFinite(rms) ? UI_RMS_DB - rms : 0;
    return `volume=${gain.toFixed(2)}dB,alimiter=limit=0.891:level=disabled`;
  }
  const I = LUFS[name] ?? HIT_LUFS;
  const out = stderrOf(["-i", wav, "-af", `loudnorm=I=${I}:TP=-1:LRA=11:print_format=json`, "-f", "null", "-"]);
  const m = JSON.parse(out.slice(out.lastIndexOf("{"), out.lastIndexOf("}") + 1));
  return (
    `loudnorm=I=${I}:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:` +
    `measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
  );
}

function encodeSfx(name, raw, dest) {
  const cut = join(TMP, `${name}.cut.wav`);
  const eq = join(TMP, `${name}.eq.wav`);
  const trim = name.startsWith("ui-") ? `${START_TRIM},atrim=0:0.25` : START_TRIM;
  ff(["-i", raw, "-ac", "1", "-ar", "22050", "-af", trim, cut]);
  if (probeDuration(cut) < 0.05) ff(["-i", raw, "-ac", "1", "-ar", "22050", cut]); // trim ate a quiet blip
  const chain = eqChain(name, probeDuration(cut));
  ff(["-i", cut, ...(chain.length ? ["-af", chain.join(",")] : []), eq]);
  ff(["-i", eq, "-af", loudnessFilter(name, eq), "-b:a", "64k", dest]);
  rmSync(cut);
  rmSync(eq);
}

// Raw SFX masters are committed so loudness/EQ can be re-tuned without paying for regeneration.
const SRC = new URL("./audio-src/", import.meta.url).pathname;
mkdirSync(SRC, { recursive: true });

const wanted = process.argv.slice(2);
let credits = 0;
for (const [name, spec] of Object.entries(PACK)) {
  if (wanted.length && !wanted.includes(name)) continue;
  const raw = spec.kind === "sfx" ? join(SRC, `${name}.bin`) : join(TMP, `${name}.bin`);
  if (!existsSync(raw)) {
    console.log("generating", name);
    const { url, credits: c } = await run(spec.model, spec.input);
    credits += c ?? 0;
    if (!url) throw new Error(`no output for ${name}`);
    writeFileSync(raw, Buffer.from(await (await fetch(url)).arrayBuffer()));
  } else console.log("reprocessing", name);
  const dest = join(OUT, `${name}.${spec.kind === "music" ? "m4a" : "mp3"}`);
  // Music: full-length AAC 64k stereo (~1.4MB for 3 minutes); src/audio.ts crossfades the tail into
  // the head at runtime for a gapless loop. SFX: cleaned up, loudness-matched, mono mp3.
  if (spec.kind === "music") {
    ff(["-i", raw, "-c:a", "aac", "-ac", "2", "-ar", "44100", "-b:a", "64k", dest]);
    rmSync(raw);
  } else {
    encodeSfx(name, raw, dest);
  }
  if (!existsSync(dest)) throw new Error(`transcode failed: ${name}`);
}
console.log("credits used:", credits);
