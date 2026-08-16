// Quirks: a passive trait rolled PER INDIVIDUAL critter (not per species like Pokemon
// abilities, not a flat stat nudge like natures). Two of the same species can differ, and
// summoned critters feel unique. Battle logic reads these via the helpers below; the pure
// damage math in battle.ts stays untouched so its unit tests remain deterministic.
export type QuirkId =
  | "none"
  | "sunborn"
  | "skittish"
  | "stoneheart"
  | "thornskin"
  | "tidalheart"
  | "brightdream";

export interface QuirkDef {
  id: QuirkId;
  name: string;
  desc: string;
  emoji: string;
  dealtMult: number; // multiplier on damage this critter deals
  takenMult: number; // multiplier on damage this critter takes
  takenFlat: number; // flat damage reduction when hit
  recoilFrac: number; // fraction of damage dealt reflected back to the attacker
  healFrac: number; // fraction of maxHp healed at the end of this critter's turn
  xpMult: number; // multiplier on XP this critter earns
}

const base = {
  dealtMult: 1,
  takenMult: 1,
  takenFlat: 0,
  recoilFrac: 0,
  healFrac: 0,
  xpMult: 1,
};

export const QUIRKS: Record<QuirkId, QuirkDef> = {
  none: { id: "none", name: "Plain", desc: "No special quirk.", emoji: "", ...base },
  sunborn: { id: "sunborn", name: "Sunborn", desc: "Hits harder (+20% damage dealt).", emoji: "☀️", ...base, dealtMult: 1.2 },
  skittish: { id: "skittish", name: "Skittish", desc: "Dodgy (-15% damage taken).", emoji: "💨", ...base, takenMult: 0.85 },
  stoneheart: { id: "stoneheart", name: "Stoneheart", desc: "Tough (-2 flat damage taken).", emoji: "🪨", ...base, takenFlat: 2 },
  thornskin: { id: "thornskin", name: "Thornskin", desc: "Reflects 15% of damage back.", emoji: "🌵", ...base, recoilFrac: 0.15 },
  tidalheart: { id: "tidalheart", name: "Tidalheart", desc: "Heals a little each turn.", emoji: "🌊", ...base, healFrac: 0.06 },
  brightdream: { id: "brightdream", name: "Brightdream", desc: "Learns fast (+50% XP).", emoji: "✨", ...base, xpMult: 1.5 },
};

const ROLLABLE: QuirkId[] = ["sunborn", "skittish", "stoneheart", "thornskin", "tidalheart", "brightdream"];

/** Roll a random real quirk (never "none"). */
export function rollQuirk(rng: () => number = Math.random): QuirkId {
  return ROLLABLE[Math.floor(rng() * ROLLABLE.length)];
}

/** Safe lookup; unknown ids fall back to "none". */
export function quirkDef(id: QuirkId | undefined): QuirkDef {
  return QUIRKS[id ?? "none"] ?? QUIRKS.none;
}
