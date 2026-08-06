// localStorage persistence: team, caught critters, player position.
export interface SavedCritter {
  id: string;
  level: number;
  xp: number;
  hp: number;
}
export interface SaveData {
  team: SavedCritter[];
  caught: string[]; // caught names (HUD)
  pos: { x: number; z: number };
  seen?: string[]; // species ids encountered (dex)
  caughtIds?: string[]; // species ids ever caught/owned (dex)
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
