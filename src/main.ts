import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import "./style.css";
import { Overworld } from "./world/overworld";
import { makeCritter } from "./game/battle";
import type { Critter } from "./game/battle";
import { SPECIES, STARTERS } from "./game/critters";
import { runBattle } from "./ui/battleUI";
import { openDex } from "./ui/dex";
import { sfx, startMusic, toggleMusic } from "./audio";
import { loadSave, writeSave, clearSave } from "./game/save";
import type { SaveData } from "./game/save";

const app = document.querySelector<HTMLDivElement>("#app")!;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.75;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
app.appendChild(renderer.domElement);

const world = new Overworld(window.innerWidth / window.innerHeight);
world.active = false; // frozen until a starter is chosen

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(world.scene, world.camera));
composer.addPass(
  new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.7, 0.85)
);
composer.addPass(new OutputPass());

// --- player state ---
const team: Critter[] = [];
const caught: string[] = [];
const seen = new Set<string>(); // species ids encountered (dex)
const caughtIds = new Set<string>(); // species ids ever owned (dex)

function syncDex() {
  for (const m of team) {
    seen.add(m.species.id);
    caughtIds.add(m.species.id);
  }
}

const MAX_TEAM = 6;

const hud = document.createElement("div");
hud.className = "hud";
document.body.appendChild(hud);

const mute = document.createElement("button");
mute.className = "mute";
mute.textContent = "🔊";
mute.title = "Toggle music";
mute.addEventListener("click", () => {
  mute.textContent = toggleMusic() ? "🔊" : "🔇";
});
document.body.appendChild(mute);
function drawHud() {
  if (!team.length) return;
  hud.innerHTML = `<strong>Critter Vale</strong> · Sprout Hollow<br>Team: ${team
    .map((m) => `${m.species.name} Lv${m.level} (${m.hp}/${m.maxHp} HP)`)
    .join(", ")}<br>Caught: ${caught.length ? caught.join(", ") : "none yet"}<br><small>WASD / arrows · grass = wild critters · E talk · green pad heals · C = Dex</small>`;
}

function persist() {
  if (!team.length) return;
  writeSave({
    team: team.map((m) => ({ id: m.species.id, level: m.level, xp: m.xp, hp: m.hp })),
    caught,
    pos: world.getPos(),
    seen: [...seen],
    caughtIds: [...caughtIds],
  });
}

world.onEncounter = ({ speciesId, level }) => {
  sfx("encounter");
  seen.add(speciesId); // dex: encountered
  const wild = makeCritter(speciesId, level);
  runBattle(team, [wild], (outcome, w) => {
    if (outcome === "caught" && w) {
      if (team.length < MAX_TEAM) team.push(w); // caught critter joins the party
      if (!caught.includes(w.species.name)) caught.push(w.species.name);
      caughtIds.add(w.species.id);
    }
    if (outcome === "lost") team.forEach((m) => (m.hp = m.maxHp)); // whole team recovers in town
    syncDex(); // picks up evolutions + owned species
    drawHud(); // reflect XP / level-ups + catches
    persist();
    world.resume();
  });
};

// trainer battles
const beatenTrainers = new Set<string>();
function startTrainer(npc: { name: string; challenge?: { party: { id: string; level: number }[]; winLine: string } }) {
  if (!npc.challenge) return;
  const foeParty = npc.challenge.party.map((p) => makeCritter(p.id, p.level));
  foeParty.forEach((m) => seen.add(m.species.id)); // trainer mons count as seen
  sfx("encounter");
  runBattle(
    team,
    foeParty,
    (outcome) => {
      if (outcome === "won") {
        beatenTrainers.add(npc.name);
        showToast(`🏅 ${npc.challenge!.winLine}`);
      }
      if (outcome === "lost") team.forEach((m) => (m.hp = m.maxHp));
      syncDex();
      drawHud();
      persist();
      world.resume();
    },
    { trainerName: npc.name }
  );
}

// NPC dialog
world.onInteract = (npc) => {
  const d = document.createElement("div");
  d.className = "dialog";
  let i = 0;
  const render = () => {
    d.innerHTML = `<div class="dialog-box"><div class="dialog-name">${npc.name}</div><p>${npc.lines[i]}</p><div class="dialog-cont">▶ space / click${i < npc.lines.length - 1 ? "" : " to close"}</div></div>`;
  };
  const afterDialog = () => {
    if (npc.challenge && !beatenTrainers.has(npc.name)) startTrainer(npc);
    else world.resume();
  };
  const close = () => {
    d.remove();
    window.removeEventListener("keydown", onKey);
    afterDialog();
  };
  const advance = () => {
    i += 1;
    if (i >= npc.lines.length) close();
    else render();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === " " || e.key === "e" || e.key === "Enter") {
      e.preventDefault();
      advance();
    } else if (e.key === "Escape") close();
  };
  d.addEventListener("click", advance);
  window.addEventListener("keydown", onKey);
  render();
  document.body.appendChild(d);
};

function showToast(msg: string) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

world.onHeal = () => {
  if (!team.length) return;
  const hurt = team.some((m) => m.hp < m.maxHp);
  team.forEach((m) => (m.hp = m.maxHp));
  if (hurt) {
    showToast("💚 Your critters are fully healed!");
    sfx("levelup");
    drawHud();
    persist();
  }
};

window.addEventListener("beforeunload", persist);

// New Game button (clears save)
const reset = document.createElement("button");
reset.className = "mute reset";
reset.textContent = "⟳";
reset.title = "New game (erases progress)";
reset.addEventListener("click", () => {
  if (confirm("Start a new game? This erases your saved progress.")) {
    // Empty in-memory state FIRST so the beforeunload persist() no-ops and
    // does not immediately re-write the save we are clearing.
    team.length = 0;
    caught.length = 0;
    clearSave();
    location.reload();
  }
});
document.body.appendChild(reset);

const dexBtn = document.createElement("button");
dexBtn.className = "mute dexbtn";
dexBtn.textContent = "📖";
dexBtn.title = "Critter-Dex (C)";
dexBtn.addEventListener("click", () => openDex(seen, caughtIds));
document.body.appendChild(dexBtn);
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "c" && team.length && !document.querySelector(".battle, .dialog, .title")) {
    openDex(seen, caughtIds);
  }
});

function armMusicOnGesture() {
  const start = () => {
    startMusic();
    window.removeEventListener("keydown", start);
    window.removeEventListener("pointerdown", start);
  };
  window.addEventListener("keydown", start);
  window.addEventListener("pointerdown", start);
}

function resumeFromSave(s: SaveData) {
  for (const c of s.team) {
    const m = makeCritter(c.id, c.level);
    m.xp = c.xp;
    if (typeof c.hp === "number") m.hp = Math.max(1, Math.min(m.maxHp, c.hp));
    team.push(m);
  }
  (s.seen ?? []).forEach((id) => seen.add(id));
  (s.caughtIds ?? []).forEach((id) => caughtIds.add(id));
  syncDex();
  world.setPos(s.pos.x, s.pos.z);
  world.resume();
  drawHud();
  armMusicOnGesture();
}

// --- title screen + starter select ---
function showTitle() {
  const title = document.createElement("div");
  title.className = "title";
  title.innerHTML = `
    <div class="title-inner">
      <h1>Critter Vale</h1>
      <p>Choose your first partner</p>
      <div class="starters">
        ${STARTERS.map((id) => {
          const s = SPECIES[id];
          return `<button class="starter" data-id="${id}" style="--c:${s.color}">
            <img src="/sprites/${id}.png" alt="">
            <span class="s-name">${s.name}</span>
            <span class="s-el">${s.element}</span>
          </button>`;
        }).join("")}
      </div>
      <p class="hint">Ember beats Leaf · Leaf beats Aqua · Aqua beats Ember</p>
    </div>`;
  document.body.appendChild(title);

  title.querySelectorAll<HTMLButtonElement>(".starter").forEach((btn) => {
    btn.addEventListener("click", () => {
      team.push(makeCritter(btn.dataset.id!, 6));
      syncDex();
      startMusic();
      sfx("levelup");
      title.classList.add("fade");
      setTimeout(() => title.remove(), 500);
      world.resume();
      drawHud();
      persist();
    });
  });
}

const existing = loadSave();
if (existing) resumeFromSave(existing);
else showTitle();

const prompt = document.createElement("div");
prompt.className = "prompt";
prompt.addEventListener("click", () => world.interact());
document.body.appendChild(prompt);

let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  world.update(dt);
  const hint = world.hint();
  if (hint) {
    prompt.textContent = hint;
    prompt.classList.add("show");
  } else {
    prompt.classList.remove("show");
  }
  composer.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  composer.setSize(w, h);
  world.onResize(w / h);
});
