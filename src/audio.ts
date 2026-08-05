// Tiny audio manager. Plays /public/audio/*.mp3 if present; silent no-op if missing.
// Files are generated separately and dropped into public/audio/.

type SfxName = "hit" | "catch" | "encounter" | "levelup";

const VOL: Record<SfxName, number> = {
  hit: 0.5,
  catch: 0.6,
  encounter: 0.5,
  levelup: 0.6,
};

// small pool per sound so rapid repeats don't cut each other off
const pools: Partial<Record<SfxName, HTMLAudioElement[]>> = {};

function pool(name: SfxName): HTMLAudioElement[] {
  if (!pools[name]) {
    pools[name] = Array.from({ length: 3 }, () => {
      const a = new Audio(`/audio/${name}.mp3`);
      a.volume = VOL[name];
      a.preload = "auto";
      return a;
    });
  }
  return pools[name]!;
}

export function sfx(name: SfxName) {
  const p = pool(name);
  const a = p.find((x) => x.paused || x.ended) ?? p[0];
  try {
    a.currentTime = 0;
    void a.play().catch(() => {});
  } catch {
    /* file missing or blocked: silent */
  }
}

let music: HTMLAudioElement | null = null;
export function startMusic() {
  if (music) return;
  music = new Audio("/audio/bgm.mp3");
  music.loop = true;
  music.volume = 0.32;
  void music.play().catch(() => {
    music = null; // autoplay blocked or file missing
  });
}

export function toggleMusic(): boolean {
  if (!music) {
    startMusic();
    return true;
  }
  if (music.paused) void music.play().catch(() => {});
  else music.pause();
  return !music.paused;
}
