// Wellspring Fusion: pick two critters, the Wellspring dreams them into one hybrid
// (AI-generated sprite blending both). The two parents merge into the result. This has
// no equivalent in mainline creature games and reuses the summon pipeline.
import type { Critter } from "../game/battle";
import { fuseSpecies, spriteUrl } from "../game/customSpecies";
import type { CustomSpecies } from "../game/customSpecies";
import { generateCritter } from "./summonApi";

const STATUS_LINES = [
  "The Wellspring stirs...",
  "Weaving two dreams together...",
  "A new shape emerges...",
  "Almost whole...",
];

interface FusionCtx {
  party: Critter[];
  sprigs: number;
  cost: number;
  onFused: (a: Critter, b: Critter, spec: CustomSpecies) => void;
}

export function openFusionLab(ctx: FusionCtx) {
  if (document.querySelector(".summon")) return;
  let cancelled = false;
  const sel: number[] = []; // selected party indices, in order (A then B)

  const root = document.createElement("div");
  root.className = "summon";
  const close = () => {
    cancelled = true;
    root.remove();
    window.removeEventListener("keydown", onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };

  const renderPicker = () => {
    if (ctx.party.length < 2) {
      root.innerHTML = `
        <div class="summon-panel">
          <div class="summon-head"><h2>🌀 Wellspring Fusion</h2><button class="summon-close" aria-label="Close">✕</button></div>
          <p class="summon-sub">You need at least two critters to fuse. Catch or summon another first.</p>
        </div>`;
      root.querySelector(".summon-close")!.addEventListener("click", close);
      return;
    }
    const canFuse = sel.length === 2 && ctx.sprigs >= ctx.cost;
    root.innerHTML = `
      <div class="summon-panel">
        <div class="summon-head"><h2>🌀 Wellspring Fusion</h2><span class="shop-sprigs">🌱 ${ctx.sprigs}</span><button class="summon-close" aria-label="Close">✕</button></div>
        <p class="summon-sub">Choose two critters. The Wellspring will merge them into one new hybrid. <strong>The two originals are consumed.</strong></p>
        <div class="fusion-grid">
          ${ctx.party
            .map((m, i) => {
              const pick = sel.indexOf(i);
              const tag = pick === 0 ? "A" : pick === 1 ? "B" : "";
              return `<button class="fusion-cell${pick >= 0 ? " on" : ""}" data-i="${i}" style="--c:${m.species.color}">
                  ${tag ? `<span class="fusion-tag">${tag}</span>` : ""}
                  <img src="${spriteUrl(m.species.id)}" alt="">
                  <span>${m.species.name} <small>Lv${m.level}</small></span>
                </button>`;
            })
            .join("")}
        </div>
        <div class="summon-actions">
          <button class="summon-go" data-act="fuse"${canFuse ? "" : " disabled"}>Fuse 🌱${ctx.cost}</button>
        </div>
        <p class="summon-note">${
          ctx.sprigs < ctx.cost ? "Not enough Sprigs." : "Parent A's element and quirk carry into the hybrid."
        }</p>
      </div>`;
    root.querySelector(".summon-close")!.addEventListener("click", close);
    root.querySelectorAll<HTMLButtonElement>(".fusion-cell").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.i);
        const at = sel.indexOf(i);
        if (at >= 0) sel.splice(at, 1);
        else if (sel.length < 2) sel.push(i);
        else {
          sel.shift();
          sel.push(i);
        }
        renderPicker();
      });
    });
    root.querySelector('[data-act="fuse"]')?.addEventListener("click", onFuse);
  };

  const renderLoading = () => {
    root.innerHTML = `
      <div class="summon-panel">
        <div class="summon-loading">
          <div class="summon-orb" style="--c:#a66bff"></div>
          <p class="summon-status">${STATUS_LINES[0]}</p>
        </div>
      </div>`;
    let i = 0;
    const statusEl = root.querySelector(".summon-status") as HTMLElement;
    const timer = setInterval(() => {
      i = (i + 1) % STATUS_LINES.length;
      if (statusEl) statusEl.textContent = STATUS_LINES[i];
      if (cancelled) clearInterval(timer);
    }, 3500);
    return () => clearInterval(timer);
  };

  const renderError = (msg: string) => {
    root.innerHTML = `
      <div class="summon-panel">
        <div class="summon-head"><h2>Fusion failed</h2><button class="summon-close" aria-label="Close">✕</button></div>
        <p class="summon-sub">${msg}</p>
        <div class="summon-actions"><button class="summon-go" data-act="retry">Back</button></div>
      </div>`;
    root.querySelector(".summon-close")!.addEventListener("click", close);
    root.querySelector('[data-act="retry"]')!.addEventListener("click", renderPicker);
  };

  const renderPreview = (spec: CustomSpecies, a: Critter, b: Critter) => {
    root.innerHTML = `
      <div class="summon-panel">
        <div class="summon-head"><h2>${spec.name} emerged!</h2></div>
        <p class="summon-sub">${a.species.name} + ${b.species.name} became ${spec.name}.</p>
        <div class="summon-preview" style="--c:${spec.color}">
          <img src="${spec.imageUrl}" alt="${spec.name}">
          <div class="summon-stats">
            <span class="summon-badge" style="background:${spec.color}">${spec.element}</span>
            <div>HP ${spec.baseHp} · ATK ${spec.baseAtk} · DEF ${spec.baseDef}</div>
          </div>
        </div>
        <div class="summon-actions">
          <button class="summon-go" data-act="keep">Keep it</button>
        </div>
      </div>`;
    root.querySelector('[data-act="keep"]')!.addEventListener("click", () => {
      ctx.onFused(a, b, spec);
      close();
    });
  };

  async function onFuse() {
    if (sel.length !== 2 || ctx.sprigs < ctx.cost) return;
    const a = ctx.party[sel[0]];
    const b = ctx.party[sel[1]];
    cancelled = false;
    const stopStatus = renderLoading();
    try {
      const desc = `a hybrid fusion of a ${a.species.name} and a ${b.species.name}, blending the features of both into one creature`;
      const url = await generateCritter(desc, a.species.element, () => cancelled);
      stopStatus();
      if (cancelled) return;
      renderPreview(fuseSpecies(a, b, url), a, b);
    } catch (err) {
      stopStatus();
      if (!cancelled)
        renderError((err as Error).message === "timed out" ? "That took too long. Try again." : "The fusion fizzled. Try again.");
    }
  }

  document.body.appendChild(root);
  renderPicker();
  window.addEventListener("keydown", onKey);
}
