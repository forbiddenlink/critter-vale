// Items, currency (Sprigs), and the shop. Pure data + helpers, unit-tested.
export type ItemId = "dew-potion" | "vale-ball" | "gilded-ball" | "revive";

export interface ItemDef {
  id: ItemId;
  name: string;
  desc: string;
  price: number; // Sprigs
  kind: "heal" | "ball" | "revive";
  power: number; // heal: HP restored; ball: catch multiplier; revive: fraction of maxHp
  emoji: string;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  "dew-potion": {
    id: "dew-potion",
    name: "Dew Potion",
    desc: "Restores 40 HP to a critter.",
    price: 60,
    kind: "heal",
    power: 40,
    emoji: "💧",
  },
  "vale-ball": {
    id: "vale-ball",
    name: "Vale Ball",
    desc: "A standard catching ball.",
    price: 40,
    kind: "ball",
    power: 1.3,
    emoji: "🟢",
  },
  "gilded-ball": {
    id: "gilded-ball",
    name: "Gilded Ball",
    desc: "A superior ball. Much better catch odds.",
    price: 120,
    kind: "ball",
    power: 1.8,
    emoji: "🟡",
  },
  revive: {
    id: "revive",
    name: "Revive",
    desc: "Revives a fainted critter to half HP.",
    price: 150,
    kind: "revive",
    power: 0.5,
    emoji: "✨",
  },
};

export const SHOP_ORDER: ItemId[] = ["dew-potion", "vale-ball", "gilded-ball", "revive"];

export type Bag = Partial<Record<ItemId, number>>;

/** A new tamer's starting kit (also the "New Game" default). */
export function starterBag(): Bag {
  return { "vale-ball": 5, "dew-potion": 2 };
}
export const STARTER_SPRIGS = 50;

/** Sprigs awarded for winning a battle. Trainers pay more than wild critters. */
export function battleReward(foeLevel: number, isTrainer: boolean): number {
  const base = isTrainer ? 18 : 8;
  const perLevel = isTrainer ? 4 : 2;
  return Math.max(1, Math.round(base + foeLevel * perLevel));
}

/** Total count of items held (for empty-bag checks). */
export function bagCount(bag: Bag): number {
  return Object.values(bag).reduce((a, n) => a + (n ?? 0), 0);
}

/** Remove one of an item. Returns true if one was available and consumed. */
export function consume(bag: Bag, id: ItemId): boolean {
  const n = bag[id] ?? 0;
  if (n <= 0) return false;
  bag[id] = n - 1;
  return true;
}

/** Add n of an item to the bag. */
export function add(bag: Bag, id: ItemId, n = 1): void {
  bag[id] = (bag[id] ?? 0) + n;
}
