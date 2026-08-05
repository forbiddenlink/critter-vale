// Pure battle logic for Critter Vale. Deterministic, unit-tested.
import type { Element, Species } from "./critters";
import { SPECIES } from "./critters";

export interface Critter {
  species: Species;
  level: number;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  xp: number;
}

/** Element triangle: Ember > Leaf > Aqua > Ember. 2x advantage, 0.5x disadvantage, else 1x. */
const BEATS: Record<Element, Element> = {
  Ember: "Leaf",
  Leaf: "Aqua",
  Aqua: "Ember",
};

export function elementMultiplier(atk: Element, def: Element): number {
  if (BEATS[atk] === def) return 2;
  if (BEATS[def] === atk) return 0.5;
  return 1;
}

/** Stat at a given level: base scaled linearly. */
function statAt(base: number, level: number): number {
  return Math.floor(base + (base * (level - 1)) / 12);
}

export function makeCritter(speciesId: string, level: number): Critter {
  const species = SPECIES[speciesId];
  if (!species) throw new Error(`unknown species: ${speciesId}`);
  const maxHp = statAt(species.baseHp, level) + level * 2;
  return {
    species,
    level,
    maxHp,
    hp: maxHp,
    atk: statAt(species.baseAtk, level),
    def: statAt(species.baseDef, level),
    xp: 0,
  };
}

export interface Move {
  name: string;
  power: number;
  element: Element;
}

export const MOVESETS: Record<string, [Move, Move]> = {
  emberpup: [
    { name: "Ember Nip", power: 30, element: "Ember" },
    { name: "Tackle", power: 22, element: "Aqua" }, // off-type neutral-ish filler
  ],
  tadmite: [
    { name: "Bubble Jet", power: 30, element: "Aqua" },
    { name: "Tackle", power: 22, element: "Leaf" },
  ],
  leaflet: [
    { name: "Leaf Slash", power: 30, element: "Leaf" },
    { name: "Tackle", power: 22, element: "Ember" },
  ],
  mothbit: [
    { name: "Spore Puff", power: 26, element: "Leaf" },
    { name: "Flutter", power: 18, element: "Aqua" },
  ],
};

export function movesFor(speciesId: string): [Move, Move] {
  return MOVESETS[speciesId] ?? [
    { name: "Tackle", power: 22, element: SPECIES[speciesId]?.element ?? "Leaf" },
    { name: "Struggle", power: 14, element: "Leaf" },
  ];
}

function computeDamage(
  attacker: Critter,
  target: Critter,
  power: number,
  atkElement: Element
): number {
  const mult = elementMultiplier(atkElement, target.species.element);
  const levelScale = (2 * attacker.level) / 5 + 2;
  const raw = ((levelScale * power * attacker.atk) / (target.def * 5) + 2) * mult;
  return Math.max(1, Math.floor(raw));
}

/** Damage of a raw attack using the attacker's own element. */
export function damage(attacker: Critter, target: Critter, movePower: number): number {
  return computeDamage(attacker, target, movePower, attacker.species.element);
}

/** Damage of a specific move (move carries its own element for the type triangle). */
export function moveDamage(attacker: Critter, target: Critter, move: Move): number {
  return computeDamage(attacker, target, move.power, move.element);
}

/** XP awarded for defeating (or catching) a critter. */
export function xpReward(defeated: Critter): number {
  return Math.max(1, Math.floor(defeated.level * 6 + defeated.species.baseHp * 0.5));
}

export function xpToNext(level: number): number {
  return level * level * 8;
}

/** Grant XP; may level up (recomputes stats, heals the HP gained). Returns levels gained. */
export function gainXp(c: Critter, amount: number): number {
  let gained = 0;
  c.xp += amount;
  while (c.xp >= xpToNext(c.level)) {
    c.xp -= xpToNext(c.level);
    c.level += 1;
    gained += 1;
    const fresh = makeCritter(c.species.id, c.level);
    const hpGain = fresh.maxHp - c.maxHp;
    c.maxHp = fresh.maxHp;
    c.atk = fresh.atk;
    c.def = fresh.def;
    c.hp = Math.min(c.maxHp, c.hp + Math.max(0, hpGain));
  }
  return gained;
}

/** Probability of catching a wild critter given current HP + species catchRate. [0,1]. */
export function catchChance(target: Critter): number {
  const hpFactor = 1 - target.hp / target.maxHp; // 0 full -> 1 fainted
  const base = target.species.catchRate;
  const p = base * (0.4 + 0.6 * hpFactor); // even at full hp there is a floor chance
  return Math.min(1, Math.max(0, p));
}

/** Attempt a catch. rng() returns [0,1); injected for deterministic tests. */
export function attemptCatch(target: Critter, rng: () => number = Math.random): boolean {
  return rng() < catchChance(target);
}
