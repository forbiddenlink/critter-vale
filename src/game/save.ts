// localStorage persistence: team, caught critters, player position.
import type { CustomSpecies } from "./customSpecies";
import type { Bag } from "./items";
import type { QuirkId } from "./traits";
import type { Element } from "./critters";
import { SPECIES } from "./critters";
import { QUIRKS } from "./traits";
import { ITEMS } from "./items";

export interface SavedCritter {
  id: string;
  level: number;
  xp: number;
  hp: number;
  quirk?: QuirkId; // per-individual trait (optional for pre-quirk saves)
}
export interface SaveData {
  team: SavedCritter[];
  caught: string[]; // caught names (HUD)
  pos: { x: number; z: number };
  seen?: string[]; // species ids encountered (dex)
  caughtIds?: string[]; // species ids ever caught/owned (dex)
  custom?: CustomSpecies[]; // summoned critters (full defs, re-registered on load)
  sprigs?: number; // currency
  bag?: Bag; // item inventory
  crests?: Element[]; // Warden crests earned
  champion?: boolean; // beat the Champion
  beaten?: string[]; // trainer/warden names already defeated
}

const KEY = "critter-vale-save-v1";

export type SaveLoad = { status: "none" } | { status: "ok"; data: SaveData } | { status: "corrupt" };

const ELEMENTS: readonly string[] = ["Ember", "Aqua", "Leaf", "Normal"];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

function validCustom(c: unknown): boolean {
  if (!isObj(c)) return false;
  const move = (m: unknown) => isObj(m) && typeof m.name === "string" && isNum(m.power) && ELEMENTS.includes(m.element as string);
  return (
    typeof c.id === "string" &&
    typeof c.name === "string" &&
    ELEMENTS.includes(c.element as string) &&
    isNum(c.baseHp) &&
    isNum(c.baseAtk) &&
    isNum(c.baseDef) &&
    isNum(c.catchRate) &&
    typeof c.color === "string" &&
    typeof c.accent === "string" &&
    typeof c.imageUrl === "string" &&
    Array.isArray(c.moves) &&
    c.moves.length === 2 &&
    c.moves.every(move)
  );
}

/**
 * Shape + reference check of untrusted save JSON. Returns the data when every field the game
 * dereferences on resume is sound, else null. Species ids must exist in the built-in table or
 * in the save's own summoned list, because makeCritter throws on an unknown id.
 */
export function validateSave(raw: unknown): SaveData | null {
  if (!isObj(raw)) return null;
  const { team, caught, pos, seen, caughtIds, custom, sprigs, bag, crests, champion, beaten } = raw;

  if (custom !== undefined && !(Array.isArray(custom) && custom.every(validCustom))) return null;
  const customIds = new Set((custom as { id: string }[] | undefined)?.map((c) => c.id));

  if (!Array.isArray(team) || team.length < 1 || team.length > 6) return null;
  for (const m of team) {
    if (!isObj(m)) return null;
    if (typeof m.id !== "string" || !(Object.hasOwn(SPECIES, m.id) || customIds.has(m.id))) return null;
    if (!isNum(m.level) || !Number.isInteger(m.level) || m.level < 1 || m.level > 100) return null;
    if (!isNum(m.xp) || m.xp < 0) return null;
    if (m.hp !== undefined && !isNum(m.hp)) return null;
    if (m.quirk !== undefined && !(typeof m.quirk === "string" && Object.hasOwn(QUIRKS, m.quirk))) return null;
  }

  if (!isStrArr(caught)) return null;
  if (!isObj(pos) || !isNum(pos.x) || !isNum(pos.z)) return null;
  if (seen !== undefined && !isStrArr(seen)) return null;
  if (caughtIds !== undefined && !isStrArr(caughtIds)) return null;
  if (beaten !== undefined && !isStrArr(beaten)) return null;
  if (sprigs !== undefined && !(isNum(sprigs) && sprigs >= 0)) return null;
  if (champion !== undefined && typeof champion !== "boolean") return null;
  if (crests !== undefined && !(Array.isArray(crests) && crests.every((c) => ELEMENTS.includes(c as string)))) return null;
  if (bag !== undefined) {
    if (!isObj(bag)) return null;
    for (const [k, v] of Object.entries(bag)) if (!Object.hasOwn(ITEMS, k) || !isNum(v) || v < 0) return null;
  }
  return raw as unknown as SaveData;
}

/** Distinguishes "no save yet" from "a save exists but cannot be used". */
export function readSave(): SaveLoad {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { status: "none" }; // storage disabled: behave like a first visit
  }
  if (!raw) return { status: "none" };
  try {
    const data = validateSave(JSON.parse(raw));
    return data ? { status: "ok", data } : { status: "corrupt" };
  } catch {
    return { status: "corrupt" };
  }
}

export function loadSave(): SaveData | null {
  const r = readSave();
  return r.status === "ok" ? r.data : null;
}

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full / disabled: ignore */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
