// Runtime "summoned" critters: species that don't exist at build time but are
// generated live in the Summon Lab, registered into the game, and persisted.
import { SPECIES } from "./critters";
import type { Species, Element } from "./critters";
import { MOVESETS } from "./battle";
import type { Move } from "./battle";

// --- sprite URL resolver (custom critters load from a remote URL, not /sprites) ---
const spriteUrls = new Map<string, string>();
export function registerSpriteUrl(id: string, url: string) {
  spriteUrls.set(id, url);
}
/** Sprite source for a species id: a registered custom URL, else the bundled PNG. */
export function spriteUrl(id: string): string {
  return spriteUrls.get(id) ?? `/sprites/${id}.png`;
}

export interface CustomSpecies {
  id: string;
  name: string;
  element: Element;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  catchRate: number;
  color: string;
  accent: string;
  imageUrl: string;
  moves: [Move, Move];
}

const ELEMENT_PALETTE: Record<Element, { color: string; accent: string }> = {
  Ember: { color: "#ff7a3c", accent: "#ffd24a" },
  Aqua: { color: "#3ca7ff", accent: "#bfeaff" },
  Leaf: { color: "#4cc95a", accent: "#d4f7a0" },
  Normal: { color: "#b8b8c0", accent: "#e8e8ee" },
};

/** A url-safe, unique-ish id from the chosen name. */
export function customId(name: string): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20) || "critter";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `custom-${base}-${suffix}`;
}

/** Roll a balanced custom species in the wild-base stat band. */
export function rollCustom(id: string, name: string, element: Element, imageUrl: string): CustomSpecies {
  const r = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
  const pal = ELEMENT_PALETTE[element];
  const stab: Move = {
    name: element === "Ember" ? "Ember Burst" : element === "Aqua" ? "Aqua Burst" : "Leaf Burst",
    power: 30,
    element,
  };
  const filler: Move = { name: "Tackle", power: 24, element: "Normal" };
  return {
    id,
    name,
    element,
    baseHp: r(22, 28),
    baseAtk: r(9, 13),
    baseDef: r(8, 12),
    catchRate: 1,
    color: pal.color,
    accent: pal.accent,
    imageUrl,
    moves: [stab, filler],
  };
}

/** Register a custom species into the live game (SPECIES, MOVESETS, sprite URL). Idempotent. */
export function registerCustom(c: CustomSpecies) {
  const sp: Species = {
    id: c.id,
    name: c.name,
    element: c.element,
    baseHp: c.baseHp,
    baseAtk: c.baseAtk,
    baseDef: c.baseDef,
    catchRate: c.catchRate,
    color: c.color,
    accent: c.accent,
  };
  SPECIES[c.id] = sp;
  MOVESETS[c.id] = c.moves;
  registerSpriteUrl(c.id, c.imageUrl);
}
