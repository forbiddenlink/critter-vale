// localStorage persistence: team, caught critters, player position.
import type { CustomSpecies } from "./customSpecies";
import type { Bag } from "./items";
import type { QuirkId } from "./traits";
import type { Element } from "./critters";

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

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (!data.team?.length) return null;
    return data;
  } catch {
    return null;
  }
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
