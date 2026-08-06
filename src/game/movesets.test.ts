// MOVESETS + movesFor() cross the SPECIES/battle boundary and have no direct coverage:
// battle.test.ts only exercises movesFor for the 4 species it happens to use in battle
// scenarios. A newly-added species with no MOVESETS entry silently falls back to a
// generic Tackle/Struggle pair (see movesFor) instead of failing loudly - that's a real
// regression risk worth locking down.
import { describe, it, expect } from "vitest";
import { MOVESETS, movesFor } from "./battle";
import { SPECIES } from "./critters";

describe("movesFor", () => {
  it("never throws, even for a totally unknown species id", () => {
    expect(() => movesFor("does-not-exist")).not.toThrow();
  });

  it("falls back to a generic Tackle/Struggle pair for an unknown species", () => {
    const [primary, secondary] = movesFor("does-not-exist");
    expect(primary.name).toBe("Tackle");
    expect(secondary.name).toBe("Struggle");
  });

  it("the fallback moveset still has positive power (never a 0-damage soft-lock)", () => {
    const [primary, secondary] = movesFor("does-not-exist");
    expect(primary.power).toBeGreaterThan(0);
    expect(secondary.power).toBeGreaterThan(0);
  });

  it("returns exactly two moves for every real species", () => {
    for (const id of Object.keys(SPECIES)) {
      expect(movesFor(id).length).toBe(2);
    }
  });
});

describe("MOVESETS data integrity", () => {
  it("every species in SPECIES has an explicit moveset (does not silently rely on the fallback)", () => {
    for (const id of Object.keys(SPECIES)) {
      expect(MOVESETS[id]).toBeDefined();
    }
  });

  it("every move has positive power", () => {
    for (const [primary, secondary] of Object.values(MOVESETS)) {
      expect(primary.power).toBeGreaterThan(0);
      expect(secondary.power).toBeGreaterThan(0);
    }
  });

  it("the first (STAB) move always matches the species' own element", () => {
    for (const [id, [stab]] of Object.entries(MOVESETS)) {
      expect(stab.element).toBe(SPECIES[id].element);
    }
  });

  it("the second move is always the neutral Normal element (guaranteed non-resisted fallback move)", () => {
    for (const [, [, secondary]] of Object.entries(MOVESETS)) {
      expect(secondary.element).toBe("Normal");
    }
  });

  it("the STAB move is never weaker than the secondary move", () => {
    for (const [stab, secondary] of Object.values(MOVESETS)) {
      expect(stab.power).toBeGreaterThanOrEqual(secondary.power);
    }
  });
});
