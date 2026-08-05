// Original creature data for Critter Vale. No Pokemon IP.
// Element triangle: Ember > Leaf > Aqua > Ember.

// "Normal" is a move-only element: always neutral (1x) both ways. Creatures never use it.
export type Element = "Ember" | "Aqua" | "Leaf" | "Normal";

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
  cindershrew: {
    id: "cindershrew",
    name: "Cindershrew",
    element: "Ember",
    baseHp: 22,
    baseAtk: 11,
    baseDef: 9,
    catchRate: 0.45,
    color: "#ff8b4a",
    accent: "#ffcf6a",
  },
  brinefin: {
    id: "brinefin",
    name: "Brinefin",
    element: "Aqua",
    baseHp: 24,
    baseAtk: 10,
    baseDef: 10,
    catchRate: 0.45,
    color: "#2fb6c9",
    accent: "#d6f6ff",
  },
};

export const STARTERS = ["emberpup", "tadmite", "leaflet"] as const;
export const WILD_POOL = ["mothbit", "leaflet", "tadmite", "cindershrew", "brinefin"] as const;
