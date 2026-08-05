// Original creature data for Critter Vale. No Pokemon IP.
// Element triangle: Ember > Leaf > Aqua > Ember.

export type Element = "Ember" | "Aqua" | "Leaf";

export interface Species {
  id: string;
  name: string;
  element: Element;
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  catchRate: number; // 0..1 baseline ease of capture
  color: string; // placeholder billboard tint
  accent: string; // secondary sprite color
}

export const SPECIES: Record<string, Species> = {
  emberpup: {
    id: "emberpup",
    name: "Emberpup",
    element: "Ember",
    baseHp: 24,
    baseAtk: 12,
    baseDef: 8,
    catchRate: 0.35,
    color: "#ff7a3c",
    accent: "#ffd24a",
  },
  tadmite: {
    id: "tadmite",
    name: "Tadmite",
    element: "Aqua",
    baseHp: 28,
    baseAtk: 9,
    baseDef: 11,
    catchRate: 0.35,
    color: "#3ca7ff",
    accent: "#bfeaff",
  },
  leaflet: {
    id: "leaflet",
    name: "Leaflet",
    element: "Leaf",
    baseHp: 26,
    baseAtk: 10,
    baseDef: 10,
    catchRate: 0.35,
    color: "#4cc95a",
    accent: "#d4f7a0",
  },
  mothbit: {
    id: "mothbit",
    name: "Mothbit",
    element: "Leaf",
    baseHp: 18,
    baseAtk: 8,
    baseDef: 6,
    catchRate: 0.6, // common, easy to catch
    color: "#b98cff",
    accent: "#efe4ff",
  },
};

export const STARTERS = ["emberpup", "tadmite", "leaflet"] as const;
export const WILD_POOL = ["mothbit", "leaflet", "tadmite"] as const;
