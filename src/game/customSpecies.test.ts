// Summoned critters are generated at runtime, so their shape can't be eyeballed like
// the static SPECIES table. Lock the same invariants the SPECIES/MOVESETS tests enforce.
import { describe, it, expect } from "vitest";
import { rollCustom, registerCustom, customId, spriteUrl } from "./customSpecies";
import type { Element } from "./critters";
import { SPECIES } from "./critters";
import { MOVESETS } from "./battle";

const HEX = /^#[0-9a-f]{6}$/i;
const ELEMENTS: Element[] = ["Ember", "Aqua", "Leaf"];

describe("rollCustom", () => {
  it("produces a valid species for every element", () => {
    for (const el of ELEMENTS) {
      const c = rollCustom("custom-test", "Testmon", el, "https://example.com/x.png");
      expect(c.element).toBe(el);
      expect(c.baseHp).toBeGreaterThan(0);
      expect(c.baseAtk).toBeGreaterThan(0);
      expect(c.baseDef).toBeGreaterThan(0);
      expect(c.catchRate).toBeGreaterThan(0);
      expect(c.catchRate).toBeLessThanOrEqual(1);
      expect(c.color).toMatch(HEX);
      expect(c.accent).toMatch(HEX);
    }
  });

  it("gives a STAB move matching its element and a Normal filler that is never stronger", () => {
    for (const el of ELEMENTS) {
      const c = rollCustom("custom-test", "Testmon", el, "https://example.com/x.png");
      const [stab, filler] = c.moves;
      expect(stab.element).toBe(el);
      expect(filler.element).toBe("Normal");
      expect(stab.power).toBeGreaterThanOrEqual(filler.power);
      expect(filler.power).toBeGreaterThan(0);
    }
  });
});

describe("customId", () => {
  it("is url-safe and prefixed", () => {
    const id = customId("Zappy Pup!! 123");
    expect(id).toMatch(/^custom-[a-z0-9-]+$/);
  });

  it("is unique across calls with the same name", () => {
    expect(customId("Sparky")).not.toBe(customId("Sparky"));
  });
});

describe("registerCustom", () => {
  it("makes the critter usable by the rest of the game (SPECIES, MOVESETS, sprite URL)", () => {
    const id = customId("Registered");
    const c = rollCustom(id, "Registered", "Aqua", "https://example.com/reg.png");
    registerCustom(c);
    expect(SPECIES[id]).toBeDefined();
    expect(SPECIES[id].element).toBe("Aqua");
    expect(MOVESETS[id]).toBeDefined();
    expect(MOVESETS[id].length).toBe(2);
    expect(spriteUrl(id)).toBe("https://example.com/reg.png");
  });

  it("falls back to the bundled sprite path for an unregistered id", () => {
    expect(spriteUrl("emberpup")).toBe("/sprites/emberpup.png");
  });
});
