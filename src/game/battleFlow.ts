// Pure battle-flow helpers kept out of the DOM layer so they can be unit tested.
import type { Critter } from "./battle";
import { gainXp, xpReward } from "./battle";
import { quirkDef } from "./traits";

export interface PartyOption {
  index: number; // position in the party array: the stable key (species ids repeat)
  critter: Critter;
}

/** Healthy party members the player can send out, keyed by party index. */
export function switchOptions(party: Critter[], active: Critter): PartyOption[] {
  return party.flatMap((critter, index) => (critter.hp > 0 && critter !== active ? [{ index, critter }] : []));
}

/** Fainted party members a revive can target, keyed by party index. */
export function reviveOptions(party: Critter[]): PartyOption[] {
  return party.flatMap((critter, index) => (critter.hp <= 0 ? [{ index, critter }] : []));
}

/**
 * A foe fainted: the active critter earns XP for THIS foe (trainer teams included, not only
 * the last one), then the next living foe, if any, is returned.
 */
export function faintFoe(
  foes: Critter[],
  active: Critter,
  fainted: Critter,
  party: Critter[] = []
): { levels: number; benchLevels: { critter: Critter; levels: number }[]; next: Critter | null } {
  const reward = xpReward(fainted);
  const levels = gainXp(active, Math.round(reward * quirkDef(active.quirk).xpMult));
  // Benched, still-standing teammates share part of the XP so a rotating team is not left behind.
  const benchLevels = party
    .filter((m) => m !== active && m.hp > 0)
    .map((critter) => ({ critter, levels: gainXp(critter, Math.floor(reward * BENCH_XP_SHARE * quirkDef(critter.quirk).xpMult)) }));
  const next = foes.find((m) => m.hp > 0) ?? null;
  return { levels, benchLevels, next };
}

/** Fraction of a foe's XP that each living benched teammate earns (GAM-001). */
export const BENCH_XP_SHARE = 0.5;

/** Wild grass stays below the lowest Warden (Lv12) so it never outranks a gym. */
const WILD_TOP_CAP = 10;

/**
 * Level for a wild encounter, scaled to the party's strongest critter (GAM-001: fixed Lv3-7 wilds
 * made every level past ~7 a grind). Band is top-2..top+1, floor 3, top capped at WILD_TOP_CAP.
 * `rand` returns [0,1), injected so it is testable.
 */
export function wildLevel(partyTopLevel: number, rand: () => number): number {
  const top = Math.min(partyTopLevel, WILD_TOP_CAP);
  const lo = Math.max(3, top - 2);
  const hi = Math.max(lo, top + 1);
  return lo + Math.floor(rand() * (hi - lo + 1));
}
