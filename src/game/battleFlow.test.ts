import { describe, it, expect } from "vitest";
import { makeCritter, xpReward } from "./battle";
import { switchOptions, reviveOptions, faintFoe } from "./battleFlow";

describe("faintFoe (GAM-002: XP on every foe faint)", () => {
  it("grants XP for each foe in a trainer party, not just the last", () => {
    const active = makeCritter("emberpup", 6, "none"); // 288 xp to next: no level-up muddying the sums
    const foes = [makeCritter("mothbit", 4, "none"), makeCritter("mothbit", 5, "none"), makeCritter("mothbit", 6, "none")];
    let expected = 0;
    for (let i = 0; i < foes.length; i++) {
      foes[i].hp = 0;
      const { next } = faintFoe(foes, active, foes[i]);
      expected += xpReward(foes[i]);
      expect(active.xp).toBe(expected);
      expect(next).toBe(i < foes.length - 1 ? foes[i + 1] : null);
    }
    expect(active.level).toBe(6);
  });

  it("awards exactly xpReward(foe) for a single faint (neutral quirk)", () => {
    const active = makeCritter("emberpup", 3, "none");
    const foe = makeCritter("mothbit", 2, "none");
    const foes = [foe, makeCritter("mothbit", 2, "none")];
    foe.hp = 0;
    const startXp = active.xp;
    faintFoe(foes, active, foe);
    expect(active.xp - startXp).toBe(xpReward(foe));
  });
});

describe("switch/revive options (GAM-003: key by party index)", () => {
  it("keeps duplicate species distinct by party index", () => {
    const party = [makeCritter("emberpup", 5), makeCritter("emberpup", 9), makeCritter("emberpup", 7)];
    const opts = switchOptions(party, party[0]);
    expect(opts.map((o) => o.index)).toEqual([1, 2]);
    // choosing the second button must resolve to the lv7 critter, not the first emberpup
    expect(party[opts[1].index].level).toBe(7);
  });

  it("skips fainted critters for switching", () => {
    const party = [makeCritter("emberpup", 5), makeCritter("emberpup", 9), makeCritter("emberpup", 7)];
    party[1].hp = 0;
    expect(switchOptions(party, party[0]).map((o) => o.index)).toEqual([2]);
  });

  it("revive lists only fainted critters by party index, duplicates distinct", () => {
    const party = [makeCritter("emberpup", 5), makeCritter("emberpup", 9), makeCritter("emberpup", 7)];
    party[1].hp = 0;
    party[2].hp = 0;
    const opts = reviveOptions(party);
    expect(opts.map((o) => o.index)).toEqual([1, 2]);
    expect(party[opts[1].index].level).toBe(7);
  });
});
