// SPECIES/STARTERS/WILD_POOL have never had a dedicated test. This is pure data,
// but it is hand-edited and battle.ts / sprites / save-loading all trust its shape
// implicitly (a typo'd evolvesTo or an out-of-range catchRate fails silently at runtime).
import { describe, it, expect } from "vitest";
import { SPECIES, STARTERS, WILD_POOL } from "./critters";
import type { Element } from "./critters";

const HEX = /^#[0-9a-f]{6}$/i;
const VALID_ELEMENTS: Element[] = ["Ember", "Aqua", "Leaf", "Normal"];

describe("SPECIES table shape", () => {
  it("every species' own id matches its record key", () => {
    for (const [key, sp] of Object.entries(SPECIES)) {
      expect(sp.id).toBe(key);
    }
  });

  it("every species has a real element", () => {
    for (const sp of Object.values(SPECIES)) {
      expect(VALID_ELEMENTS).toContain(sp.element);
    }
  });

  it("no species uses the move-only Normal element (Normal is neutral filler for moves)", () => {
    for (const sp of Object.values(SPECIES)) {
      expect(sp.element).not.toBe("Normal");
    }
  });

  it("base stats are positive", () => {
    for (const sp of Object.values(SPECIES)) {
      expect(sp.baseHp).toBeGreaterThan(0);
      expect(sp.baseAtk).toBeGreaterThan(0);
      expect(sp.baseDef).toBeGreaterThan(0);
    }
  });

  it("catchRate is a probability in (0,1]", () => {
    for (const sp of Object.values(SPECIES)) {
      expect(sp.catchRate).toBeGreaterThan(0);
      expect(sp.catchRate).toBeLessThanOrEqual(1);
    }
  });

  it("color and accent are valid hex colors", () => {
    for (const sp of Object.values(SPECIES)) {
      expect(sp.color).toMatch(HEX);
      expect(sp.accent).toMatch(HEX);
    }
  });
});

describe("evolution chain integrity", () => {
  it("every evolvesTo points at a species that actually exists", () => {
    for (const sp of Object.values(SPECIES)) {
      if (sp.evolvesTo) {
        expect(SPECIES[sp.evolvesTo]).toBeDefined();
      }
    }
  });

  it("evolvesTo and evolvesAt are always set together, never just one", () => {
    for (const sp of Object.values(SPECIES)) {
      const hasTarget = sp.evolvesTo !== undefined;
      const hasLevel = sp.evolvesAt !== undefined;
      expect(hasTarget).toBe(hasLevel);
    }
  });

  it("evolvesAt is a sane positive level when present", () => {
    for (const sp of Object.values(SPECIES)) {
      if (sp.evolvesAt !== undefined) {
        expect(sp.evolvesAt).toBeGreaterThan(0);
      }
    }
  });

  it("evolution never creates a cycle (a final form does not evolve back)", () => {
    for (const sp of Object.values(SPECIES)) {
      if (!sp.evolvesTo) continue;
      const evolved = SPECIES[sp.evolvesTo];
      expect(evolved.evolvesTo).not.toBe(sp.id);
    }
  });

  it("each evolution keeps or raises every base stat (evolving should never weaken you)", () => {
    for (const sp of Object.values(SPECIES)) {
      if (!sp.evolvesTo) continue;
      const evolved = SPECIES[sp.evolvesTo];
      expect(evolved.baseHp).toBeGreaterThanOrEqual(sp.baseHp);
      expect(evolved.baseAtk).toBeGreaterThanOrEqual(sp.baseAtk);
      expect(evolved.baseDef).toBeGreaterThanOrEqual(sp.baseDef);
    }
  });
});

describe("STARTERS and WILD_POOL reference real species", () => {
  it("every starter id exists in SPECIES", () => {
    for (const id of STARTERS) {
      expect(SPECIES[id]).toBeDefined();
    }
  });

  it("there are exactly three starters, one per element, none evolved already", () => {
    expect(STARTERS.length).toBe(3);
    const elements = new Set(STARTERS.map((id) => SPECIES[id].element));
    expect(elements.size).toBe(3);
    for (const id of STARTERS) {
      expect(SPECIES[id].evolvesAt).toBeDefined(); // starters are base forms
    }
  });

  it("every wild pool id exists in SPECIES", () => {
    for (const id of WILD_POOL) {
      expect(SPECIES[id]).toBeDefined();
    }
  });

  it("wild pool never includes a fully-evolved final form (keeps early encounters winnable)", () => {
    for (const id of WILD_POOL) {
      const sp = SPECIES[id];
      const isFinalForm = !sp.evolvesTo && Object.values(SPECIES).some((s) => s.evolvesTo === sp.id);
      expect(isFinalForm).toBe(false);
    }
  });
});
