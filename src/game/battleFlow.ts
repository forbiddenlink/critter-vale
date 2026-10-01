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
  fainted: Critter
): { levels: number; next: Critter | null } {
  const levels = gainXp(active, Math.round(xpReward(fainted) * quirkDef(active.quirk).xpMult));
  const next = foes.find((m) => m.hp > 0) ?? null;
  return { levels, next };
}
