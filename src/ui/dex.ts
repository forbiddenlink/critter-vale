// Critter-Dex: a collection screen over all species, showing caught / seen / unknown.
import { SPECIES } from "../game/critters";

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
];

export function openDex(seen: Set<string>, caught: Set<string>) {
  if (document.querySelector(".dex")) return;
  const total = DEX_ORDER.length;
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
        ${DEX_ORDER.map((id) => {
          const s = SPECIES[id];
          const isCaught = caught.has(id);
          const isSeen = seen.has(id);
          const state = isCaught ? "caught" : isSeen ? "seen" : "unknown";
          const name = isCaught || isSeen ? s.name : "???";
          const el = isCaught ? s.element : isSeen ? "seen" : "—";
          const stats = isCaught
            ? `<div class="dex-stats">HP ${s.baseHp} · ATK ${s.baseAtk} · DEF ${s.baseDef}</div>`
            : "";
          return `<div class="dex-cell ${state}" style="--c:${s.color}">
            ${
              isCaught || isSeen
                ? `<img src="/sprites/${id}.png" alt="">`
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
