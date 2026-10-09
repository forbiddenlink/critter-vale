import { describe, it, expect } from "vitest";
import { makeCritter, xpReward } from "./battle";
import { switchOptions, reviveOptions, faintFoe, wildLevel, BENCH_XP_SHARE } from "./battleFlow";

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

describe("faintFoe bench share (GAM-001: XP reaches the whole team)", () => {
  it("gives living benched members half the active critter's XP", () => {
    const active = makeCritter("emberpup", 6, "none");
    const bench = makeCritter("leaflet", 4, "none");
    const foe = makeCritter("mothbit", 6, "none");
    foe.hp = 0;
    const { benchLevels } = faintFoe([foe], active, foe, [active, bench]);
    expect(active.xp).toBe(xpReward(foe));
    expect(bench.xp).toBe(Math.floor(xpReward(foe) * BENCH_XP_SHARE));
    expect(benchLevels).toEqual([{ critter: bench, levels: 0 }]);
  });

  it("skips fainted benched members and the active critter itself", () => {
    const active = makeCritter("emberpup", 6, "none");
    const down = makeCritter("leaflet", 4, "none");
    down.hp = 0;
    const foe = makeCritter("mothbit", 6, "none");
    foe.hp = 0;
    const { benchLevels } = faintFoe([foe], active, foe, [active, down]);
    expect(down.xp).toBe(0);
    expect(benchLevels).toEqual([]);
  });

  it("reports a bench level-up", () => {
    const active = makeCritter("emberpup", 6, "none");
    const bench = makeCritter("leaflet", 1, "none");
    const foe = makeCritter("mothbit", 20, "none"); // big reward
    foe.hp = 0;
    const { benchLevels } = faintFoe([foe], active, foe, [active, bench]);
    expect(benchLevels[0].levels).toBeGreaterThan(0);
    expect(bench.level).toBeGreaterThan(1);
  });

  it("is a no-op for the bench when no party is passed (old call shape)", () => {
    const active = makeCritter("emberpup", 6, "none");
    const foe = makeCritter("mothbit", 6, "none");
    foe.hp = 0;
    expect(faintFoe([foe], active, foe).benchLevels).toEqual([]);
  });
});

describe("wildLevel (GAM-001: wild zones scale with the team)", () => {
  it("never drops below the original floor of 3", () => {
    expect(wildLevel(1, () => 0)).toBe(3);
  });
  it("tracks the strongest party member: from top-2 to top+1", () => {
    expect(wildLevel(10, () => 0)).toBe(8);
    expect(wildLevel(10, () => 0.999)).toBe(11);
  });
  it("matches the old 3-7 band for a fresh level-6 starter", () => {
    expect(wildLevel(6, () => 0)).toBe(4);
    expect(wildLevel(6, () => 0.999)).toBe(7);
  });
  it("caps below the Warden tier so grass never outranks a gym", () => {
    expect(wildLevel(40, () => 0.999)).toBe(11);
    expect(wildLevel(40, () => 0)).toBe(8);
  });
});
