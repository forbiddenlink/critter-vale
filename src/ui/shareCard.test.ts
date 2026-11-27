import { describe, expect, it } from "vitest";
import { buildLayout, buildSummary, truncateName, CARD_W, CARD_H, MAX_NAME_CHARS } from "./shareCard";
import type { ShareMember } from "./shareCard";

const mk = (n: number, name = "Emberpup"): ShareMember[] =>
  Array.from({ length: n }, (_, i) => ({ id: `c${i}`, name, level: 5 + i, element: "Ember" as const }));

describe("buildSummary", () => {
  it("handles an empty team", () => {
    const s = buildSummary([]);
    expect(s).toContain("https://critter-vale.vercel.app");
    expect(s).toContain("just starting");
  });
  it("handles one critter", () => {
    expect(buildSummary(mk(1))).toBe("My Critter Vale team (1 critter): Emberpup Lv 5. Build yours: https://critter-vale.vercel.app");
  });
  it("lists six critters in order", () => {
    const s = buildSummary(mk(6));
    expect(s).toContain("(6 critters)");
    expect(s).toContain("Emberpup Lv 5, Emberpup Lv 6");
    expect(s).toContain("Emberpup Lv 10.");
  });
  it("contains no em dashes", () => {
    expect(buildSummary(mk(3))).not.toContain("—");
  });
});

describe("truncateName", () => {
  it("keeps short names", () => expect(truncateName("Leaflet")).toBe("Leaflet"));
  it("cuts long names with an ellipsis", () => {
    const t = truncateName("Supercalifragilistic");
    expect([...t].length).toBe(MAX_NAME_CHARS);
    expect(t.endsWith("…")).toBe(true);
  });
});

describe("buildLayout", () => {
  it("is 1200x630", () => {
    const l = buildLayout([]);
    expect([l.width, l.height]).toEqual([CARD_W, CARD_H]);
  });
  it("team of 0 is empty with no slots", () => {
    const l = buildLayout([]);
    expect(l.empty).toBe(true);
    expect(l.slots).toHaveLength(0);
  });
  it("team of 1 is centered", () => {
    const l = buildLayout(mk(1));
    expect(l.slots).toHaveLength(1);
    expect(l.slots[0].x + l.slots[0].w / 2).toBe(CARD_W / 2);
  });
  it("team of 6 fills two rows of three inside the card", () => {
    const l = buildLayout(mk(6));
    expect(l.slots).toHaveLength(6);
    expect(new Set(l.slots.map((s) => s.y)).size).toBe(2);
    for (const s of l.slots) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x + s.w).toBeLessThanOrEqual(CARD_W);
      expect(s.y + s.h).toBeLessThanOrEqual(CARD_H - 40);
    }
  });
  it("truncates long names", () => {
    const l = buildLayout(mk(1, "Extraordinarily Long Name"));
    expect([...l.slots[0].name].length).toBeLessThanOrEqual(MAX_NAME_CHARS);
    expect(l.slots[0].name.endsWith("…")).toBe(true);
  });
  it("ignores members past six", () => {
    expect(buildLayout(mk(9)).slots).toHaveLength(6);
  });
});
