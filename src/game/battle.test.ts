import { describe, it, expect } from "vitest";
import {
  makeCritter,
  damage,
  moveDamage,
  movesFor,
  elementMultiplier,
  catchChance,
  attemptCatch,
  xpReward,
  gainXp,
} from "./battle";
import { SPECIES } from "./critters";

describe("elementMultiplier (Ember > Leaf > Aqua > Ember)", () => {
  it("is 2x on advantage", () => {
    expect(elementMultiplier("Ember", "Leaf")).toBe(2);
    expect(elementMultiplier("Leaf", "Aqua")).toBe(2);
    expect(elementMultiplier("Aqua", "Ember")).toBe(2);
  });
  it("is 0.5x on disadvantage", () => {
    expect(elementMultiplier("Leaf", "Ember")).toBe(0.5);
    expect(elementMultiplier("Aqua", "Leaf")).toBe(0.5);
    expect(elementMultiplier("Ember", "Aqua")).toBe(0.5);
  });
  it("is 1x on neutral / same element", () => {
    expect(elementMultiplier("Ember", "Ember")).toBe(1);
  });
});

describe("damage", () => {
  it("is at least 1", () => {
    const weak = makeCritter("tadmite", 1);
    const tanky = makeCritter("leaflet", 50);
    expect(damage(weak, tanky, 10)).toBeGreaterThanOrEqual(1);
  });
  it("scales up with attacker level", () => {
    const lvl5 = makeCritter("emberpup", 5);
    const lvl40 = makeCritter("emberpup", 40);
    const target = makeCritter("tadmite", 20);
    expect(damage(lvl40, target, 30)).toBeGreaterThan(damage(lvl5, target, 30));
  });
  it("advantage element deals more than disadvantage", () => {
    const ember = makeCritter("emberpup", 20);
    const leaf = makeCritter("leaflet", 20); // Ember > Leaf -> 2x
    const aqua = makeCritter("tadmite", 20); // Ember < Aqua -> 0.5x
    expect(damage(ember, leaf, 30)).toBeGreaterThan(damage(ember, aqua, 30));
  });
});

describe("catchChance", () => {
  it("rises as target HP falls", () => {
    const full = makeCritter("mothbit", 10);
    const hurt = makeCritter("mothbit", 10);
    hurt.hp = 1;
    expect(catchChance(hurt)).toBeGreaterThan(catchChance(full));
  });
  it("is a probability in [0,1]", () => {
    const c = makeCritter("mothbit", 10);
    c.hp = Math.floor(c.maxHp / 2);
    const p = catchChance(c);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});

describe("attemptCatch determinism via injected rng", () => {
  it("catches when rng below chance", () => {
    const c = makeCritter("mothbit", 5);
    c.hp = 1;
    expect(attemptCatch(c, () => 0)).toBe(true);
  });
  it("fails when rng above chance", () => {
    const c = makeCritter("mothbit", 5);
    expect(attemptCatch(c, () => 0.999999)).toBe(false);
  });
});

describe("moves + xp", () => {
  it("every species has two moves", () => {
    for (const id of ["emberpup", "tadmite", "leaflet", "mothbit"]) {
      expect(movesFor(id).length).toBe(2);
    }
  });
  it("moveDamage respects the move's own element, not the attacker's", () => {
    const emberpup = makeCritter("emberpup", 20); // Ember mon
    const leafTarget = makeCritter("leaflet", 20);
    const [stab, offType] = movesFor("emberpup"); // Ember move vs Aqua move
    // Ember move on Leaf = advantage; the Aqua move on Leaf = disadvantage
    expect(moveDamage(emberpup, leafTarget, stab)).toBeGreaterThan(
      moveDamage(emberpup, leafTarget, offType)
    );
  });
  it("xpReward is positive and scales with level", () => {
    const lo = makeCritter("mothbit", 3);
    const hi = makeCritter("mothbit", 30);
    expect(xpReward(lo)).toBeGreaterThan(0);
    expect(xpReward(hi)).toBeGreaterThan(xpReward(lo));
  });
  it("gainXp levels up and raises maxHp", () => {
    const c = makeCritter("emberpup", 5);
    const beforeHp = c.maxHp;
    const levels = gainXp(c, 100000);
    expect(levels).toBeGreaterThan(0);
    expect(c.level).toBeGreaterThan(5);
    expect(c.maxHp).toBeGreaterThan(beforeHp);
  });
});

describe("balance: no same-level one-shots (found in live playtest)", () => {
  it("a same-level super-effective move does not one-shot a full-HP target", () => {
    const atk = makeCritter("emberpup", 10);
    const def = makeCritter("leaflet", 10); // Ember > Leaf => 2x
    const stab = movesFor("emberpup")[0];
    expect(elementMultiplier(stab.element, def.species.element)).toBe(2);
    expect(moveDamage(atk, def, stab)).toBeLessThan(def.maxHp);
    expect(moveDamage(atk, def, stab)).toBeLessThan(def.maxHp * 0.75); // leaves counterplay
  });
  it("wild Aqua attack vs the Ember starter is survivable at equal level", () => {
    const wild = makeCritter("tadmite", 6);
    const player = makeCritter("emberpup", 6);
    const wildMove = movesFor("tadmite")[0]; // Aqua, 2x vs Ember
    expect(moveDamage(wild, player, wildMove)).toBeLessThan(player.maxHp);
  });
});

describe("SPECIES data integrity", () => {
  it("has the three starters + one wild", () => {
    for (const id of ["emberpup", "tadmite", "leaflet", "mothbit"]) {
      expect(SPECIES[id]).toBeDefined();
    }
  });
});
