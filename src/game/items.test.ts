import { describe, it, expect } from "vitest";
import { ITEMS, SHOP_ORDER, starterBag, battleReward, bagCount, consume, add } from "./items";

describe("ITEMS table", () => {
  it("every shop entry exists and has a positive price", () => {
    for (const id of SHOP_ORDER) {
      expect(ITEMS[id]).toBeDefined();
      expect(ITEMS[id].price).toBeGreaterThan(0);
    }
  });
  it("balls have a catch multiplier above 1", () => {
    for (const it of Object.values(ITEMS)) {
      if (it.kind === "ball") expect(it.power).toBeGreaterThan(1);
    }
  });
});

describe("battleReward", () => {
  it("scales with level and pays more for trainers than wild critters", () => {
    expect(battleReward(10, true)).toBeGreaterThan(battleReward(10, false));
    expect(battleReward(20, false)).toBeGreaterThan(battleReward(5, false));
  });
  it("is always at least 1", () => {
    expect(battleReward(1, false)).toBeGreaterThanOrEqual(1);
  });
});

describe("bag operations", () => {
  it("starter bag has catch balls to start", () => {
    expect((starterBag()["vale-ball"] ?? 0)).toBeGreaterThan(0);
  });
  it("add then consume round-trips and reports availability", () => {
    const bag = {};
    add(bag, "dew-potion", 2);
    expect(bagCount(bag)).toBe(2);
    expect(consume(bag, "dew-potion")).toBe(true);
    expect(consume(bag, "dew-potion")).toBe(true);
    expect(consume(bag, "dew-potion")).toBe(false); // empty now
    expect(bagCount(bag)).toBe(0);
  });
  it("consume on an empty bag is a no-op returning false", () => {
    expect(consume({}, "revive")).toBe(false);
  });
});
