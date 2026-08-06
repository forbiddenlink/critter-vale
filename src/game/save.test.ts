// save.ts has zero prior coverage. It is pure logic (JSON parse/serialize + guard
// clauses) once localStorage is available, so we back it with an in-memory Storage
// stand-in rather than pulling in jsdom for one file.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadSave, writeSave, clearSave } from "./save";
import type { SaveData } from "./save";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const SAVE_KEY = "critter-vale-save-v1";

const sampleSave: SaveData = {
  team: [
    { id: "emberpup", level: 6, xp: 12, hp: 30 },
    { id: "mothbit", level: 4, xp: 0, hp: 18 },
  ],
  caught: ["Mothbit"],
  pos: { x: 3.5, z: -8 },
};

let memory: MemoryStorage;
const realLocalStorage = globalThis.localStorage;

beforeEach(() => {
  memory = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: memory,
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    value: realLocalStorage,
    configurable: true,
    writable: true,
  });
});

describe("loadSave / writeSave round trip", () => {
  it("returns null when nothing has been saved yet", () => {
    expect(loadSave()).toBeNull();
  });

  it("writes then loads back an identical value", () => {
    writeSave(sampleSave);
    expect(loadSave()).toEqual(sampleSave);
  });

  it("persists under the expected localStorage key", () => {
    writeSave(sampleSave);
    expect(memory.getItem(SAVE_KEY)).toBe(JSON.stringify(sampleSave));
  });

  it("the most recent write wins", () => {
    writeSave(sampleSave);
    const second: SaveData = { ...sampleSave, caught: ["Mothbit", "Tadmite"] };
    writeSave(second);
    expect(loadSave()?.caught).toEqual(["Mothbit", "Tadmite"]);
  });
});

describe("loadSave guards against bad data", () => {
  it("returns null on malformed JSON instead of throwing", () => {
    memory.setItem(SAVE_KEY, "{not valid json");
    expect(loadSave()).toBeNull();
  });

  it("returns null when the team array is empty", () => {
    memory.setItem(SAVE_KEY, JSON.stringify({ ...sampleSave, team: [] }));
    expect(loadSave()).toBeNull();
  });

  it("returns null when team is missing entirely", () => {
    memory.setItem(SAVE_KEY, JSON.stringify({ caught: [], pos: { x: 0, z: 0 } }));
    expect(loadSave()).toBeNull();
  });

  it("returns null when localStorage.getItem throws (storage disabled)", () => {
    memory.getItem = () => {
      throw new Error("storage disabled");
    };
    expect(loadSave()).toBeNull();
  });
});

describe("writeSave / clearSave failure tolerance", () => {
  it("writeSave swallows a quota-exceeded style error instead of throwing", () => {
    memory.setItem = () => {
      throw new Error("quota exceeded");
    };
    expect(() => writeSave(sampleSave)).not.toThrow();
  });

  it("clearSave removes a previously written save", () => {
    writeSave(sampleSave);
    expect(loadSave()).not.toBeNull();
    clearSave();
    expect(loadSave()).toBeNull();
  });

  it("clearSave swallows storage errors instead of throwing", () => {
    memory.removeItem = () => {
      throw new Error("storage disabled");
    };
    expect(() => clearSave()).not.toThrow();
  });
});
