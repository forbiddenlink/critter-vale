// One-off build script: generates the audio pack with Magica, downloads every asset into
// public/audio/ (CDN URLs are never stored) and transcodes with ffmpeg.
// Usage: MAGICA_KEY=... node scripts/generate-audio.mjs [name ...]   (needs ffmpeg on PATH)
import { execFileSync } from "node:child_process";
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
  "ui-click": sfx("soft crisp UI button click, tiny wooden tick, game menu, no music", 1),
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
  const dest = join(OUT, `${name}.mp3`);
  // SFX: mono 22.05kHz 64k keeps each well under 60KB. Music: trimmed to 100s with a 3s fade and
  // 80k stereo so each loop stays under 1.2MB (lyria returns ~3 minute tracks).
  const sfxArgs = ["-ac", "1", "-ar", "22050", "-b:a", "64k"];
  const trim = ["-af", "silenceremove=start_periods=1:start_threshold=-50dB"];
  const musicArgs = ["-t", "100", "-af", "afade=t=out:st=97:d=3", "-ac", "2", "-ar", "44100", "-b:a", "80k"];
  const ff = (extra) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, ...extra, dest]);
  if (spec.kind === "music") ff(musicArgs);
  else {
    ff([...sfxArgs, ...trim]);
    // silenceremove can eat a very quiet blip entirely; fall back to the untrimmed encode.
    if (statSync(dest).size < 1024) ff(sfxArgs);
  }
  rmSync(raw);
  if (!existsSync(dest)) throw new Error(`transcode failed: ${name}`);
}
console.log("credits used:", credits);
