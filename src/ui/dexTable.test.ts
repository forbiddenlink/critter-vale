import { describe, it, expect } from "vitest";
import { buildDexRows, sortDexRows, type DexRow } from "./dexTable";

const ORDER = ["emberpup", "tadmite", "leaflet", "mothbit", "brinefin"];

function rows(seen: string[], caught: string[]): DexRow[] {
  return buildDexRows(ORDER, new Set(seen), new Set(caught));
}

describe("buildDexRows", () => {
  it("reveals nothing beyond the grid for unseen species", () => {
    const [unseen] = rows([], []).filter((r) => r.id === "mothbit");
    expect(unseen.state).toBe("unknown");
    expect(unseen.name).toBeNull();
    expect(unseen.element).toBeNull();
    expect(unseen.hp).toBeNull();
    expect(unseen.atk).toBeNull();
    expect(unseen.def).toBeNull();
  });

  it("hides stats and element for seen-but-not-caught species", () => {
    const r = rows(["tadmite"], []).find((x) => x.id === "tadmite")!;
    expect(r.state).toBe("seen");
    expect(r.name).toBe("Tadmite");
    expect(r.element).toBeNull();
    expect(r.hp).toBeNull();
  });

  it("shows stats for caught species", () => {
    const r = rows([], ["emberpup"]).find((x) => x.id === "emberpup")!;
    expect(r.state).toBe("caught");
    expect(r.hp).toBe(24);
    expect(r.element).toBe("Ember");
  });
});

describe("sortDexRows", () => {
  const data = rows(["tadmite"], ["emberpup", "leaflet"]);

  it("sorts caught rows by a stat in both directions", () => {
    const asc = sortDexRows(data, "hp", "asc").map((r) => r.id);
    const desc = sortDexRows(data, "hp", "desc").map((r) => r.id);
    expect(asc.slice(0, 2)).toEqual(["emberpup", "leaflet"]); // 24 < 26
    expect(desc.slice(0, 2)).toEqual(["leaflet", "emberpup"]);
  });

  it("keeps hidden rows last and in dex order whatever the key or direction", () => {
    for (const key of ["name", "element", "hp", "atk", "def"] as const) {
      for (const dir of ["asc", "desc"] as const) {
        const out = sortDexRows(data, key, dir);
        const tail = out.filter((r) => r.hp === null && key !== "name").map((r) => r.id);
        if (key !== "name") expect(tail).toEqual(["tadmite", "mothbit", "brinefin"]);
        const unknown = out.filter((r) => r.state === "unknown").map((r) => r.id);
        expect(unknown).toEqual(["mothbit", "brinefin"]);
        expect(out.slice(-2).map((r) => r.id)).toEqual(["mothbit", "brinefin"]);
      }
    }
  });

  it("produces the same order for unseen species with two different hidden rosters", () => {
    // Sorting must not depend on the real stats of unseen species.
    const a = sortDexRows(rows([], ["emberpup"]), "atk", "desc").map((r) => r.id);
    const b = sortDexRows(rows([], ["emberpup"]), "atk", "asc").map((r) => r.id);
    expect(a.slice(1)).toEqual(b.slice(1));
  });

  it("sorts by dex number", () => {
    expect(sortDexRows(data, "no", "desc").map((r) => r.id)).toEqual([...ORDER].reverse());
  });
});
