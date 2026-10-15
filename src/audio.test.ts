import { describe, it, expect } from "vitest";
import { hitSfxFor, musicSources, crossfadeLoop } from "./audio";
import type { Element } from "./game/critters";

// Keys only (no import): proves each file the code references exists in public/audio.
const files = Object.keys(import.meta.glob("../public/audio/*.{mp3,m4a}"));

describe("hitSfxFor", () => {
  it("maps every element to its own hit sound", () => {
    const els: Element[] = ["Ember", "Aqua", "Leaf", "Normal"];
    expect(els.map(hitSfxFor)).toEqual(["hit-ember", "hit-aqua", "hit-leaf", "hit-normal"]);
  });
});

describe("musicSources", () => {
  it("tries the themed loop first and falls back to the original bgm", () => {
    expect(musicSources("battle")).toEqual(["/audio/bgm-battle.m4a", "/audio/bgm.mp3"]);
    expect(musicSources("field")).toEqual(["/audio/bgm-town.m4a", "/audio/bgm.mp3"]);
  });
});

describe("audio pack files", () => {
  const names = [
    "hit-ember", "hit-aqua", "hit-leaf", "hit-normal", "ui-click", "ui-confirm", "ui-cancel",
    "summon-shimmer", "bgm", "hit", "catch", "encounter", "levelup",
  ];
  it.each(names)("%s.mp3 exists in public/audio", (name) => {
    expect(files).toContain(`../public/audio/${name}.mp3`);
  });
  it.each(["bgm-battle", "bgm-town"])("%s.m4a exists in public/audio", (name) => {
    expect(files).toContain(`../public/audio/${name}.m4a`);
  });
});

describe("crossfadeLoop", () => {
  const sr = 100;
  const ramp = (len: number) => Float32Array.from({ length: len }, (_, i) => Math.sin(i / 7));

  it("shortens the track by the fade length", () => {
    const [out] = crossfadeLoop([ramp(1000)], sr, 2);
    expect(out.length).toBe(800);
  });

  it("is continuous across the loop point (end flows into the start)", () => {
    const src = ramp(1000);
    const [out] = crossfadeLoop([src], sr, 2);
    // the sample after the last output sample is out[0]; it must continue the source's last-kept sample
    const step = Math.abs(out[0] - out[out.length - 1]);
    expect(step).toBeLessThan(0.2);
  });

  it("keeps constant power through the fade for uncorrelated-equal material", () => {
    const [out] = crossfadeLoop([new Float32Array(1000).fill(1)], sr, 2);
    // two unit signals blended at equal power sum to between 1 and sqrt(2)
    for (let i = 0; i < 200; i++) {
      expect(out[i]).toBeGreaterThanOrEqual(0.99);
      expect(out[i]).toBeLessThanOrEqual(1.42);
    }
    expect(out[500]).toBe(1);
  });

  it("clamps the fade to half the track and handles every channel", () => {
    const out = crossfadeLoop([ramp(100), ramp(100)], sr, 10);
    expect(out).toHaveLength(2);
    expect(out[0].length).toBe(50);
  });
});
