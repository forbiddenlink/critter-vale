// Mocked AudioContext/Audio lifecycle tests: the races that real browsers hit (overlapping track
// switches, mute during async load, gesture-only resume, interrupted contexts).
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

class FakeSource {
  started = false;
  stopped = false;
  disconnected = false;
  loop = false;
  buffer: unknown = null;
  connect() {}
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
  disconnect() {
    this.disconnected = true;
  }
}

interface Ctl {
  ctxs: FakeCtx[];
  sources: FakeSource[];
  resumeResolvers: (() => void)[];
  holdResume: boolean;
  audios: FakeAudio[];
  fetchFail: boolean;
  fetchGate: Promise<void> | null;
}
let ctl: Ctl;

class FakeCtx {
  state = "suspended";
  destination = {};
  listeners: Record<string, (() => void)[]> = {};
  resumeCalls = 0;
  constructor() {
    ctl.ctxs.push(this);
  }
  createGain() {
    return { gain: { value: 1 }, connect() {} };
  }
  createBuffer() {
    return { copyToChannel() {} };
  }
  createBufferSource() {
    const s = new FakeSource();
    ctl.sources.push(s);
    return s;
  }
  async decodeAudioData() {
    return { numberOfChannels: 1, sampleRate: 100, getChannelData: () => new Float32Array(1000) };
  }
  addEventListener(t: string, fn: () => void) {
    (this.listeners[t] ??= []).push(fn);
  }
  emit(t: string) {
    (this.listeners[t] ?? []).forEach((f) => f());
  }
  resume() {
    this.resumeCalls++;
    if (!ctl.holdResume) {
      this.state = "running";
      return Promise.resolve();
    }
    return new Promise<void>((res) =>
      ctl.resumeResolvers.push(() => {
        this.state = "running";
        res();
      })
    );
  }
}

class FakeAudio {
  paused = true;
  ended = false;
  currentTime = 0;
  loop = false;
  volume = 1;
  preload = "";
  src: string;
  playCalls = 0;
  pauseCalls = 0;
  constructor(src: string) {
    this.src = src;
    ctl.audios.push(this);
  }
  addEventListener() {}
  play() {
    this.playCalls++;
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.pauseCalls++;
    this.paused = true;
  }
}

const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
};

async function load() {
  vi.resetModules();
  return import("./audio");
}

beforeEach(() => {
  ctl = { ctxs: [], sources: [], resumeResolvers: [], holdResume: false, audios: [], fetchFail: false, fetchGate: null };
  vi.stubGlobal("AudioContext", FakeCtx);
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("fetch", async () => {
    if (ctl.fetchGate) await ctl.fetchGate;
    if (ctl.fetchFail) throw new TypeError("network");
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
  });
});
afterEach(() => vi.unstubAllGlobals());

const live = () => ctl.sources.filter((s) => s.started && !s.stopped);

describe("music lifecycle", () => {
  it("calls resume() synchronously inside startMusic (the gesture handler)", async () => {
    const a = await load();
    ctl.holdResume = true;
    a.startMusic();
    expect(ctl.ctxs[0].resumeCalls).toBe(1); // before any await
  });

  it("overlapping field+battle switches leave exactly one live source, and mute stops it", async () => {
    const a = await load();
    ctl.holdResume = true;
    a.startMusic();
    await flush();
    a.setMusicContext("battle"); // switch while the first resume is still pending
    await flush();
    ctl.resumeResolvers.forEach((r) => r()); // both resumes now resolve
    await flush();
    expect(live()).toHaveLength(1);
    expect(a.toggleMusic()).toBe(false);
    expect(live()).toHaveLength(0);
    expect(ctl.sources.every((s) => !s.started || s.disconnected)).toBe(true);
  });

  it("a stale resume never creates a source after mute", async () => {
    const a = await load();
    ctl.holdResume = true;
    a.startMusic();
    await flush();
    a.toggleMusic(); // mute while resume() is pending
    ctl.resumeResolvers.forEach((r) => r());
    await flush();
    expect(ctl.sources.filter((s) => s.started)).toHaveLength(0);
  });

  it("WebAudio failure while muted does not fall back to HTMLAudio", async () => {
    const a = await load();
    let release!: () => void;
    ctl.fetchGate = new Promise<void>((r) => (release = r));
    ctl.fetchFail = true;
    a.startMusic();
    await flush();
    a.toggleMusic(); // mute before the fetch rejects
    release();
    await flush();
    expect(ctl.audios.some((x) => x.playCalls > 0)).toBe(false);
  });

  it("WebAudio failure over a newer track does not start the stale HTMLAudio track", async () => {
    const a = await load();
    let release!: () => void;
    ctl.fetchGate = new Promise<void>((r) => (release = r));
    ctl.fetchFail = true;
    a.startMusic(); // field, fails later
    await flush();
    a.setMusicContext("battle"); // newer request supersedes
    release();
    await flush();
    // only the battle request may fall back; the field one must not
    const played = ctl.audios.filter((x) => x.playCalls > 0).map((x) => x.src);
    expect(played.every((s) => s.includes("battle"))).toBe(true);
  });

  it("falls back to HTMLAudio when WebAudio fails and sound is on", async () => {
    const a = await load();
    ctl.fetchFail = true;
    a.startMusic();
    await flush();
    expect(ctl.audios.some((x) => x.playCalls > 0)).toBe(true);
    expect(live()).toHaveLength(0);
  });

  it("keeps gesture listeners armed until running, then re-arms when the context is interrupted", async () => {
    const a = await load();
    const handlers = new Map<string, () => void>();
    const target = {
      addEventListener: (t: string, f: () => void) => handlers.set(t, f),
      removeEventListener: (t: string) => void handlers.delete(t),
    } as unknown as EventTarget;
    ctl.holdResume = true;
    a.armMusicOnGesture(target);
    expect(handlers.size).toBe(3);

    handlers.get("pointerdown")!(); // first gesture: starts music; context still suspended
    await flush();
    expect(handlers.size).toBe(3); // not running yet: stay armed

    ctl.resumeResolvers.forEach((r) => r()); // browser finally resumes the context
    await flush();
    handlers.get("pointerdown")!(); // next gesture sees running state and disarms
    expect(handlers.size).toBe(0);

    const ctx = ctl.ctxs[0];
    ctx.state = "interrupted"; // iOS call/Siri
    ctx.emit("statechange");
    expect(handlers.size).toBe(3); // re-armed so the next tap resumes audio
  });

  it("does not re-arm for an interruption while muted", async () => {
    const a = await load();
    const handlers = new Map<string, () => void>();
    const target = {
      addEventListener: (t: string, f: () => void) => handlers.set(t, f),
      removeEventListener: (t: string) => void handlers.delete(t),
    } as unknown as EventTarget;
    a.armMusicOnGesture(target);
    handlers.get("keydown")!();
    await flush();
    expect(handlers.size).toBe(0); // context resumed inside the gesture: disarmed
    a.toggleMusic(); // mute
    ctl.ctxs[0].state = "interrupted";
    ctl.ctxs[0].emit("statechange");
    expect(handlers.size).toBe(0);
  });
});

describe("SFX and mute", () => {
  it("muting pauses effects that are currently playing and blocks new ones", async () => {
    const a = await load();
    a.startMusic();
    await flush();
    a.sfx("hit");
    const playing = ctl.audios.filter((x) => x.src.includes("hit.mp3") && x.playCalls > 0);
    expect(playing.length).toBe(1);
    a.toggleMusic(); // mute
    expect(playing[0].paused).toBe(true);
    const before = ctl.audios.reduce((n, x) => n + x.playCalls, 0);
    a.sfx("catch");
    expect(ctl.audios.reduce((n, x) => n + x.playCalls, 0)).toBe(before);
  });
});
