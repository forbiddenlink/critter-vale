import { describe, it, expect } from "vitest";
import { QUIRKS, rollQuirk, quirkDef } from "./traits";
import { makeCritter } from "./battle";

describe("rollQuirk", () => {
  it("never rolls 'none' (every critter gets a real trait)", () => {
    for (let i = 0; i < 50; i++) {
      expect(rollQuirk()).not.toBe("none");
    }
  });
  it("respects an injected rng (deterministic)", () => {
    expect(rollQuirk(() => 0)).toBe(rollQuirk(() => 0));
  });
});

describe("quirkDef", () => {
  it("falls back to 'none' for undefined or unknown ids", () => {
    expect(quirkDef(undefined).id).toBe("none");
    expect(quirkDef("nope" as never).id).toBe("none");
  });
  it("every quirk has non-negative, sane modifiers", () => {
    for (const q of Object.values(QUIRKS)) {
      expect(q.dealtMult).toBeGreaterThan(0);
      expect(q.takenMult).toBeGreaterThan(0);
      expect(q.takenFlat).toBeGreaterThanOrEqual(0);
      expect(q.xpMult).toBeGreaterThan(0);
    }
  });
});

describe("makeCritter integration", () => {
  it("assigns a real quirk by default", () => {
    expect(makeCritter("emberpup", 5).quirk).not.toBe("none");
  });
  it("honors an explicit quirk (used when loading a save)", () => {
    expect(makeCritter("emberpup", 5, "sunborn").quirk).toBe("sunborn");
  });
});
