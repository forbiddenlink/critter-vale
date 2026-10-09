// Summon Lab: describe a critter, generate it live via /api/summon (which proxies
// Magica so the key stays server-side), then add the result to your party.
import type { Element } from "../game/critters";
import { customId, rollCustom } from "../game/customSpecies";
import type { CustomSpecies } from "../game/customSpecies";
import { generateCritter } from "./summonApi";

const ELEMENTS: Element[] = ["Ember", "Aqua", "Leaf"];
const STATUS_LINES = [
  "Gathering wild motes...",
  "Shaping a new critter...",
  "Coaxing it into being...",
  "Almost there...",
  "Adding the finishing spark...",
];

export function openSummonLab(onSummoned: (c: CustomSpecies) => void, partyFull = false) {
  if (document.querySelector(".summon")) return;
  let element: Element = "Ember";
  let cancelled = false;
  let draftName = "";
  let draftDescription = "";

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

  const renderForm = () => {
    root.innerHTML = `
      <div class="summon-panel">
        <div class="summon-head"><h2>Summon Lab</h2><button class="summon-close" aria-label="Close">✕</button></div>
        <p class="summon-sub">Describe a critter and choose its element. ${partyFull ? "Your party is full; new discoveries will be kept in your Critter-Dex." : "The lab will bring it to life and add it to your party."}</p>
        <div class="summon-elements">
          ${ELEMENTS.map(
            (el) =>
              `<button class="summon-el${el === element ? " on" : ""}" data-el="${el}" aria-pressed="${el === element}" style="--c:${
                el === "Ember" ? "#ff7a3c" : el === "Aqua" ? "#3ca7ff" : "#4cc95a"
              }">${el}</button>`
          ).join("")}
        </div>
        <label class="summon-field" for="summon-name">Name <span>(optional)</span></label>
        <input id="summon-name" class="summon-name" maxlength="24" placeholder="Name (optional, e.g. Zappup)">
        <label class="summon-field" for="summon-desc">Describe your critter</label>
        <textarea id="summon-desc" class="summon-desc" aria-describedby="summon-validation" maxlength="200" rows="3" placeholder="Describe it: a spiky ember lizard with a lantern tail..."></textarea>
        <p id="summon-validation" class="summon-validation" role="alert" hidden></p>
        <div class="summon-actions">
          <button class="summon-go">Summon ✨</button>
        </div>
        <p class="summon-note">Uses live AI image generation (a few seconds, small cost). One at a time.</p>
      </div>`;
    const nameField = root.querySelector<HTMLInputElement>(".summon-name")!;
    const descriptionField = root.querySelector<HTMLTextAreaElement>(".summon-desc")!;
    nameField.value = draftName;
    descriptionField.value = draftDescription;
    nameField.addEventListener("input", (): void => { draftName = nameField.value; });
    descriptionField.addEventListener("input", (): void => {
      draftDescription = descriptionField.value;
      descriptionField.removeAttribute("aria-invalid");
      (root.querySelector(".summon-validation") as HTMLElement).hidden = true;
    });
    root.querySelector(".summon-close")!.addEventListener("click", close);
    root.querySelectorAll<HTMLButtonElement>(".summon-el").forEach((b) =>
      b.addEventListener("click", () => {
        element = b.dataset.el as Element;
        root.querySelectorAll(".summon-el").forEach((x) => { x.classList.remove("on"); x.setAttribute("aria-pressed", "false"); });
        b.classList.add("on");
        b.setAttribute("aria-pressed", "true");
      })
    );
    root.querySelector(".summon-go")!.addEventListener("click", onSummon);
  };

  const renderLoading = () => {
    root.innerHTML = `
      <div class="summon-panel">
        <div class="summon-head"><h2>Summoning</h2><button class="summon-close" aria-label="Cancel and close summoning">✕</button></div>
        <div class="summon-loading" role="status">
          <div class="summon-orb" style="--c:${
            element === "Ember" ? "#ff7a3c" : element === "Aqua" ? "#3ca7ff" : "#4cc95a"
          }"></div>
          <p class="summon-status">${STATUS_LINES[0]}</p>
        </div>
      </div>`;
    root.querySelector(".summon-close")!.addEventListener("click", close);
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
        <div class="summon-head"><h2>Summon failed</h2><button class="summon-close" aria-label="Close">✕</button></div>
        <p class="summon-sub">${msg}</p>
        <div class="summon-actions"><button class="summon-go" data-act="retry">Try again</button></div>
      </div>`;
    root.querySelector(".summon-close")!.addEventListener("click", close);
    root.querySelector('[data-act="retry"]')!.addEventListener("click", renderForm);
  };

  const renderPreview = (spec: CustomSpecies) => {
    root.innerHTML = `
      <div class="summon-panel">
        <div class="summon-head"><h2>${spec.name} appeared!</h2></div>
        <div class="summon-preview" style="--c:${spec.color}">
          <img src="${spec.imageUrl}" alt="${spec.name}">
          <div class="summon-stats">
            <span class="summon-badge" style="background:${spec.color}">${spec.element}</span>
            <div>HP ${spec.baseHp} · ATK ${spec.baseAtk} · DEF ${spec.baseDef}</div>
          </div>
        </div>
        <div class="summon-actions">
          <button class="summon-go" data-act="add">${partyFull ? "Keep in Critter-Dex" : "Add to party"}</button>
          <button class="summon-discard" data-act="discard">Discard</button>
        </div>
      </div>`;
    root.querySelector('[data-act="add"]')!.addEventListener("click", () => {
      onSummoned(spec);
      close();
    });
    root.querySelector('[data-act="discard"]')!.addEventListener("click", renderForm);
  };

  async function onSummon() {
    // Strip anything but letters/numbers/space/'- so the name is safe wherever it renders.
    const rawName = (root.querySelector(".summon-name") as HTMLInputElement).value;
    const name = rawName.replace(/[^\p{L}\p{N} '-]/gu, "").trim().slice(0, 24) || "Wildling";
    const description = (root.querySelector(".summon-desc") as HTMLTextAreaElement).value.trim();
    if (description.length < 3) {
      const message = root.querySelector<HTMLElement>(".summon-validation")!;
      message.textContent = "Describe your critter first (at least a few words).";
      message.hidden = false;
      const field = root.querySelector<HTMLTextAreaElement>(".summon-desc")!;
      field.setAttribute("aria-invalid", "true");
      field.focus();
      return;
    }
    cancelled = false;
    const stopStatus = renderLoading();
    try {
      const clean = await generateCritter(description, element, () => cancelled);
      stopStatus();
      if (cancelled) return;
      const id = customId(name);
      const spec = rollCustom(id, name, element, clean);
      renderPreview(spec);
    } catch (err) {
      stopStatus();
      if (!cancelled) renderError((err as Error).message === "timed out" ? "That took too long. Try again." : "The summoning fizzled. Try again.");
    }
  }

  document.body.appendChild(root);
  renderForm();
  window.addEventListener("keydown", onKey);
}
