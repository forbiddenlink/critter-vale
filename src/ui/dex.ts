// Critter-Dex: a collection screen over all species, showing caught / seen / unknown.
import { SPECIES } from "../game/critters";
import { spriteUrl } from "../game/customSpecies";

/**
 * Cursor-tracked holo-foil shimmer for `.holo` cards inside `scope`.
 * Sets CSS custom props (--mx/--my for the shimmer hotspot, --rx/--ry for tilt).
 * One delegated pointer listener per scope (simeydotme pokemon-cards technique).
 */
export function attachHolo(scope: HTMLElement, selector = ".holo") {
  const TILT = 9; // max degrees
  scope.addEventListener("pointermove", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>(selector);
    if (!card || !scope.contains(card)) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; // 0..1
    const py = (e.clientY - r.top) / r.height; // 0..1
    card.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    card.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    card.style.setProperty("--rx", `${((px - 0.5) * 2 * TILT).toFixed(2)}deg`);
    card.style.setProperty("--ry", `${((0.5 - py) * 2 * TILT).toFixed(2)}deg`);
  });
  scope.addEventListener("pointerout", (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>(selector);
    if (!card) return;
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  });
}

// Display order: base trio, their evolutions, then the extra wilds.
const DEX_ORDER = [
  "emberpup",
  "emberwulf",
  "tadmite",
  "torretoad",
  "leaflet",
  "thornmaw",
  "mothbit",
  "cindershrew",
  "brinefin",
  "scorchick",
  "pyrewing",
  "ripplet",
  "coralux",
  "sproutle",
  "bramblor",
];

export function openDex(seen: Set<string>, caught: Set<string>) {
  if (document.querySelector(".dex")) return;
  // Append any owned species not in the static order (i.e. summoned custom critters).
  const extras = [...caught, ...seen].filter((id) => !DEX_ORDER.includes(id) && SPECIES[id]);
  const order = [...DEX_ORDER, ...new Set(extras)];
  const total = order.length;
  const root = document.createElement("div");
  root.className = "dex";
  root.innerHTML = `
    <div class="dex-panel">
      <div class="dex-head">
        <h2>Critter-Dex</h2>
        <span class="dex-count">${caught.size} / ${total} caught</span>
        <button class="dex-close" aria-label="Close">✕</button>
      </div>
      <p class="dex-sub">Your field notes on the Vale's wild company. New discoveries begin in the tall grass.</p>
      <div class="dex-tools">
        <label>Find a critter<input class="dex-search" type="search" placeholder="Search discovered critters" autocomplete="off"></label>
        <label>Collection<select class="dex-state"><option value="all">All discoveries</option><option value="caught">Caught</option><option value="seen">Seen, not caught</option><option value="unknown">Undiscovered</option></select></label>
        <label>Element<select class="dex-element"><option value="all">All elements</option><option>Ember</option><option>Aqua</option><option>Leaf</option></select></label>
      </div>
      <p class="dex-results" role="status"></p>
      <div class="dex-grid"></div>
      <div class="dex-empty" hidden><h3>No field notes found</h3><p>Try another name or clear your filters. Undiscovered critters stay a mystery until you meet them.</p><button class="io-btn dex-reset">Clear filters</button></div>
      <div class="dex-hint">Catch wild critters in the tall grass to fill your Dex.</div>
    </div>`;
  document.body.appendChild(root);
  const search = root.querySelector<HTMLInputElement>(".dex-search")!;
  const stateFilter = root.querySelector<HTMLSelectElement>(".dex-state")!;
  const elementFilter = root.querySelector<HTMLSelectElement>(".dex-element")!;
  const grid = root.querySelector<HTMLElement>(".dex-grid")!;
  const renderGrid = (): void => {
    const query = search.value.trim().toLowerCase();
    const filtered = order.filter((id) => {
      const isCaught = caught.has(id);
      const isSeen = seen.has(id) || isCaught;
      const state = isCaught ? "caught" : isSeen ? "seen" : "unknown";
      return (stateFilter.value === "all" || stateFilter.value === state)
        && (elementFilter.value === "all" || (isCaught && SPECIES[id].element === elementFilter.value))
        && (!query || (isSeen && SPECIES[id].name.toLowerCase().includes(query)));
    });
    grid.innerHTML = filtered.map((id) => {
      const species = SPECIES[id];
      const isCaught = caught.has(id);
      const isSeen = seen.has(id) || isCaught;
      const state = isCaught ? "caught" : isSeen ? "seen" : "unknown";
      const evolution = isCaught && species.evolvesTo ? `<div class="dex-evolution">Evolves at Lv ${species.evolvesAt}</div>` : "";
      return `<article class="dex-cell ${state}${isCaught ? " holo" : ""}" style="--c:${species.color}">
        <span class="dex-index">NO. ${String(order.indexOf(id) + 1).padStart(3, "0")} <span>${isCaught ? "Caught" : isSeen ? "Seen" : "Unknown"}</span></span>
        ${isSeen ? `<img src="${spriteUrl(id)}" alt="" width="110" height="110" loading="lazy">` : `<div class="dex-q" aria-hidden="true">?</div>`}
        <h3 class="dex-name">${isSeen ? species.name : "Undiscovered"}</h3>
        <div class="dex-el">${isCaught ? species.element : isSeen ? "Encountered in the Vale" : "A new friend awaits"}</div>
        ${isCaught ? `<div class="dex-stats">HP ${species.baseHp} · ATK ${species.baseAtk} · DEF ${species.baseDef}</div>` : ""}${evolution}
      </article>`;
    }).join("");
    root.querySelector(".dex-results")!.textContent = `${filtered.length} of ${total} field notes · Element filters show caught critters.`;
    (root.querySelector(".dex-empty") as HTMLElement).hidden = filtered.length > 0;
  };
  search.addEventListener("input", renderGrid);
  stateFilter.addEventListener("change", renderGrid);
  elementFilter.addEventListener("change", renderGrid);
  root.querySelector(".dex-reset")!.addEventListener("click", (): void => {
    search.value = ""; stateFilter.value = "all"; elementFilter.value = "all"; renderGrid(); search.focus();
  });
  attachHolo(grid);
  renderGrid();

  const close = () => {
    root.remove();
    window.removeEventListener("keydown", onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement;
    if (e.key === "Escape" || (!typing && e.key.toLowerCase() === "x")) close();
  };
  root.querySelector(".dex-close")!.addEventListener("click", close);
  root.addEventListener("click", (e) => {
    if (e.target === root) close(); // click backdrop
  });
  window.addEventListener("keydown", onKey);
}
