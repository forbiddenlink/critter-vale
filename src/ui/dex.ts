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
      <div class="dex-grid">
        ${order.map((id) => {
          const s = SPECIES[id];
          const isCaught = caught.has(id);
          const isSeen = seen.has(id);
          const state = isCaught ? "caught" : isSeen ? "seen" : "unknown";
          const holo = isCaught ? " holo" : "";
          const name = isCaught || isSeen ? s.name : "???";
          const el = isCaught ? s.element : isSeen ? "seen" : "—";
          const stats = isCaught
            ? `<div class="dex-stats">HP ${s.baseHp} · ATK ${s.baseAtk} · DEF ${s.baseDef}</div>`
            : "";
          return `<div class="dex-cell ${state}${holo}" style="--c:${s.color}">
            ${
              isCaught || isSeen
                ? `<img src="${spriteUrl(id)}" alt="">`
                : `<div class="dex-q">?</div>`
            }
            <div class="dex-name">${name}</div>
            <div class="dex-el">${el}</div>
            ${stats}
          </div>`;
        }).join("")}
      </div>
      <div class="dex-hint">Catch wild critters in the tall grass to fill your Dex.</div>
    </div>`;
  document.body.appendChild(root);
  attachHolo(root.querySelector(".dex-grid") as HTMLElement);

  const close = () => {
    root.remove();
    window.removeEventListener("keydown", onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" || e.key.toLowerCase() === "x") close();
  };
  root.querySelector(".dex-close")!.addEventListener("click", close);
  root.addEventListener("click", (e) => {
    if (e.target === root) close(); // click backdrop
  });
  window.addEventListener("keydown", onKey);
}
