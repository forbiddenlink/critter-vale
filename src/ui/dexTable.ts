// Pure data layer for the Critter-Dex table view.
// Spoiler gating mirrors the grid in dex.ts: name needs seen, element and stats need caught.
import { SPECIES, type Element } from "../game/critters";

export type DexState = "caught" | "seen" | "unknown";
export type DexSortKey = "no" | "name" | "element" | "hp" | "atk" | "def";
export type DexSortDir = "asc" | "desc";

export interface DexRow {
  id: string;
  no: number; // 1-based dex number, already visible on grid cards
  state: DexState;
  name: string | null;
  element: Element | null;
  hp: number | null;
  atk: number | null;
  def: number | null;
}

export function buildDexRows(order: string[], seen: Set<string>, caught: Set<string>): DexRow[] {
  return order.map((id, i) => {
    const species = SPECIES[id];
    const isCaught = caught.has(id);
    const isSeen = seen.has(id) || isCaught;
    return {
      id,
      no: i + 1,
      state: isCaught ? "caught" : isSeen ? "seen" : "unknown",
      name: isSeen ? species.name : null,
      element: isCaught ? species.element : null,
      hp: isCaught ? species.baseHp : null,
      atk: isCaught ? species.baseAtk : null,
      def: isCaught ? species.baseDef : null,
    };
  });
}

const STATE_RANK: Record<DexState, number> = { caught: 0, seen: 1, unknown: 2 };

/**
 * Sort by a column. Rows whose value is hidden never take part in the comparison: they follow
 * the revealed rows, seen before unknown, each group in plain dex order whatever the key or
 * direction, so the order cannot reveal anything about species the player has not met.
 */
export function sortDexRows(rows: DexRow[], key: DexSortKey, dir: DexSortDir): DexRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === null || bv === null) {
      if (av !== null) return -1;
      if (bv !== null) return 1;
      return STATE_RANK[a.state] - STATE_RANK[b.state] || a.no - b.no;
    }
    const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
    return cmp * sign || a.no - b.no;
  });
}
