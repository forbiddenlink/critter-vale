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

function activeMon(): Critter {
  const mon = team[0];
  mon.hp = mon.maxHp; // heal on returning to overworld
  return mon;
}

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
    .map((m) => `${m.species.name} Lv${m.level}`)
    .join(", ")}<br>Caught: ${caught.length ? caught.join(", ") : "none yet"}<br><small>WASD / arrows to walk · step in tall grass to find critters</small>`;
}

function persist() {
  if (!team.length) return;
  writeSave({
    team: team.map((m) => ({ id: m.species.id, level: m.level, xp: m.xp })),
    caught,
    pos: world.getPos(),
  });
}

world.onEncounter = ({ speciesId, level }) => {
  sfx("encounter");
  const wild = makeCritter(speciesId, level);
  runBattle(activeMon(), wild, (outcome, w) => {
    if (outcome === "caught" && !caught.includes(w.species.name)) caught.push(w.species.name);
    drawHud(); // reflect XP / level-ups + new catches
    persist();
    world.resume();
  });
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
    team.push(m);
  }
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

let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  world.update(dt);
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
