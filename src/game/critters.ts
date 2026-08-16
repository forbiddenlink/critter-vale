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
  evolvesTo?: string; // species id of the evolved form
  evolvesAt?: number; // level at which it evolves
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
    evolvesTo: "emberwulf",
    evolvesAt: 12,
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
    evolvesTo: "torretoad",
    evolvesAt: 12,
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
    evolvesTo: "thornmaw",
    evolvesAt: 12,
  },
  emberwulf: {
    id: "emberwulf",
    name: "Emberwulf",
    element: "Ember",
    baseHp: 40,
    baseAtk: 19,
    baseDef: 13,
    catchRate: 0.18,
    color: "#ff5e2a",
    accent: "#ffc23a",
  },
  torretoad: {
    id: "torretoad",
    name: "Torretoad",
    element: "Aqua",
    baseHp: 46,
    baseAtk: 15,
    baseDef: 17,
    catchRate: 0.18,
    color: "#1f8fd6",
    accent: "#aee4ff",
  },
  thornmaw: {
    id: "thornmaw",
    name: "Thornmaw",
    element: "Leaf",
    baseHp: 43,
    baseAtk: 16,
    baseDef: 16,
    catchRate: 0.18,
    color: "#2fae44",
    accent: "#c6f18a",
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
  // --- AI-generated wild lines (Sprout Hollow expansion). One 2-stage line per element. ---
  scorchick: {
    id: "scorchick",
    name: "Scorchick",
    element: "Ember",
    baseHp: 23,
    baseAtk: 13,
    baseDef: 7,
    catchRate: 0.4,
    color: "#ff9130",
    accent: "#ffe27a",
    evolvesTo: "pyrewing",
    evolvesAt: 14,
  },
  pyrewing: {
    id: "pyrewing",
    name: "Pyrewing",
    element: "Ember",
    baseHp: 41,
    baseAtk: 20,
    baseDef: 12,
    catchRate: 0.16,
    color: "#ff5a1e",
    accent: "#ffd23a",
  },
  ripplet: {
    id: "ripplet",
    name: "Ripplet",
    element: "Aqua",
    baseHp: 27,
    baseAtk: 9,
    baseDef: 12,
    catchRate: 0.4,
    color: "#37b0ff",
    accent: "#cdeeff",
    evolvesTo: "coralux",
    evolvesAt: 14,
  },
  coralux: {
    id: "coralux",
    name: "Coralux",
    element: "Aqua",
    baseHp: 45,
    baseAtk: 15,
    baseDef: 18,
    catchRate: 0.16,
    color: "#1a86d0",
    accent: "#b3e6ff",
  },
  sproutle: {
    id: "sproutle",
    name: "Sproutle",
    element: "Leaf",
    baseHp: 25,
    baseAtk: 11,
    baseDef: 9,
    catchRate: 0.4,
    color: "#5ad06a",
    accent: "#dbf8a8",
    evolvesTo: "bramblor",
    evolvesAt: 14,
  },
  bramblor: {
    id: "bramblor",
    name: "Bramblor",
    element: "Leaf",
    baseHp: 43,
    baseAtk: 17,
    baseDef: 15,
    catchRate: 0.16,
    color: "#2ba33f",
    accent: "#c2ee84",
  },
};

export const STARTERS = ["emberpup", "tadmite", "leaflet"] as const;
export const WILD_POOL = [
  "mothbit",
  "leaflet",
  "tadmite",
  "cindershrew",
  "brinefin",
  "scorchick",
  "ripplet",
  "sproutle",
] as const;
