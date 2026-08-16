// Summoned critters are generated at runtime, so their shape can't be eyeballed like
// the static SPECIES table. Lock the same invariants the SPECIES/MOVESETS tests enforce.
import { describe, it, expect } from "vitest";
import { rollCustom, registerCustom, customId, spriteUrl, fuseSpecies } from "./customSpecies";
import type { Element } from "./critters";
import { SPECIES } from "./critters";
import { MOVESETS, makeCritter } from "./battle";

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

describe("fuseSpecies", () => {
  it("blends two critters into a valid hybrid, parent A's element dominant", () => {
    const a = makeCritter("emberpup", 10, "sunborn");
    const b = makeCritter("tadmite", 8, "tidalheart");
    const hybrid = fuseSpecies(a, b, "https://example.com/fx.png");
    expect(hybrid.element).toBe("Ember"); // A dominates
    expect(hybrid.baseHp).toBeGreaterThan(0);
    expect(hybrid.baseAtk).toBeGreaterThan(0);
    expect(hybrid.baseDef).toBeGreaterThan(0);
    expect(hybrid.name.length).toBeGreaterThan(0);
    expect(hybrid.moves[0].element).toBe("Ember");
    expect(hybrid.moves[1].element).toBe("Normal");
    expect(hybrid.imageUrl).toBe("https://example.com/fx.png");
  });

  it("gives the hybrid stats at least as good as the weaker parent's average", () => {
    const a = makeCritter("emberwulf", 20);
    const b = makeCritter("mothbit", 5);
    const hybrid = fuseSpecies(a, b, "https://example.com/fx.png");
    const avgHp = (a.species.baseHp + b.species.baseHp) / 2;
    expect(hybrid.baseHp).toBeGreaterThanOrEqual(Math.floor(avgHp));
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
