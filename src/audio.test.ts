import { describe, it, expect } from "vitest";
import { hitSfxFor, musicSources } from "./audio";
import type { Element } from "./game/critters";

// Keys only (no import): proves each file the code references exists in public/audio.
const files = Object.keys(import.meta.glob("../public/audio/*.mp3"));

describe("hitSfxFor", () => {
  it("maps every element to its own hit sound", () => {
    const els: Element[] = ["Ember", "Aqua", "Leaf", "Normal"];
    expect(els.map(hitSfxFor)).toEqual(["hit-ember", "hit-aqua", "hit-leaf", "hit-normal"]);
  });
});

describe("musicSources", () => {
  it("tries the themed loop first and falls back to the original bgm", () => {
    expect(musicSources("battle")).toEqual(["/audio/bgm-battle.mp3", "/audio/bgm.mp3"]);
    expect(musicSources("field")).toEqual(["/audio/bgm-town.mp3", "/audio/bgm.mp3"]);
  });
});

describe("audio pack files", () => {
  const names = [
    "hit-ember", "hit-aqua", "hit-leaf", "hit-normal", "ui-click", "ui-confirm", "ui-cancel",
    "summon-shimmer", "bgm-battle", "bgm-town", "bgm", "hit", "catch", "encounter", "levelup",
  ];
  it.each(names)("%s.mp3 exists in public/audio", (name) => {
    expect(files).toContain(`../public/audio/${name}.mp3`);
  });
});
