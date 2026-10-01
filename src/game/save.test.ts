// save.ts has zero prior coverage. It is pure logic (JSON parse/serialize + guard
// clauses) once localStorage is available, so we back it with an in-memory Storage
// stand-in rather than pulling in jsdom for one file.
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadSave, writeSave, clearSave, readSave, validateSave } from "./save";
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

describe("validateSave / readSave (DATA-001: a bad save must not brick the game)", () => {
  const withTeam = (team: unknown): unknown => ({ ...sampleSave, team });

  it("accepts a well-formed save untouched", () => {
    expect(validateSave(sampleSave)).toEqual(sampleSave);
  });

  it("rejects an unknown species id (makeCritter would throw on it)", () => {
    expect(validateSave(withTeam([{ id: "nopemon", level: 5, xp: 0, hp: 10 }]))).toBeNull();
  });

  it("accepts a team member whose species comes from the save's own custom list", () => {
    const custom = {
      id: "zorp-1",
      name: "Zorp",
      element: "Leaf",
      baseHp: 40,
      baseAtk: 10,
      baseDef: 10,
      catchRate: 1,
      color: "#fff",
      accent: "#000",
      imageUrl: "https://example.com/z.png",
      moves: [
        { name: "A", power: 40, element: "Leaf" },
        { name: "B", power: 30, element: "Normal" },
      ],
    };
    const save = { ...sampleSave, team: [{ id: "zorp-1", level: 3, xp: 0, hp: 9 }], custom: [custom] };
    expect(validateSave(save)).not.toBeNull();
  });

  it("rejects prototype-key species ids like constructor", () => {
    expect(validateSave(withTeam([{ id: "constructor", level: 5, xp: 0, hp: 5 }]))).toBeNull();
  });

  it("rejects a missing or non-finite pos", () => {
    expect(validateSave({ ...sampleSave, pos: undefined })).toBeNull();
    expect(validateSave({ ...sampleSave, pos: { x: "a", z: 1 } })).toBeNull();
    expect(validateSave({ ...sampleSave, pos: { x: NaN, z: 1 } })).toBeNull();
  });

  it("rejects bad levels, xp, and oversize teams", () => {
    expect(validateSave(withTeam([{ id: "emberpup", level: 0, xp: 0, hp: 5 }]))).toBeNull();
    expect(validateSave(withTeam([{ id: "emberpup", level: 2.5, xp: 0, hp: 5 }]))).toBeNull();
    expect(validateSave(withTeam([{ id: "emberpup", level: 5, xp: -1, hp: 5 }]))).toBeNull();
    const seven = Array.from({ length: 7 }, () => ({ id: "emberpup", level: 5, xp: 0, hp: 5 }));
    expect(validateSave(withTeam(seven))).toBeNull();
  });

  it("rejects a non-object / null / array payload", () => {
    expect(validateSave(null)).toBeNull();
    expect(validateSave("save")).toBeNull();
    expect(validateSave([])).toBeNull();
  });

  it("rejects wrong-typed optional fields", () => {
    expect(validateSave({ ...sampleSave, sprigs: "lots" })).toBeNull();
    expect(validateSave({ ...sampleSave, bag: { "dew-potion": "x" } })).toBeNull();
    expect(validateSave({ ...sampleSave, crests: ["Plasma"] })).toBeNull();
    expect(validateSave({ ...sampleSave, seen: [1, 2] })).toBeNull();
  });

  it("readSave reports none / ok / corrupt", () => {
    expect(readSave()).toEqual({ status: "none" });
    writeSave(sampleSave);
    expect(readSave()).toEqual({ status: "ok", data: sampleSave });
    memory.setItem(SAVE_KEY, "{not json");
    expect(readSave()).toEqual({ status: "corrupt" });
    memory.setItem(SAVE_KEY, JSON.stringify({ ...sampleSave, team: [{ id: "nopemon", level: 1, xp: 0 }] }));
    expect(readSave()).toEqual({ status: "corrupt" });
  });

  it("an empty-team save is corrupt-or-none, never ok", () => {
    memory.setItem(SAVE_KEY, JSON.stringify({ ...sampleSave, team: [] }));
    expect(readSave().status).not.toBe("ok");
  });
});
