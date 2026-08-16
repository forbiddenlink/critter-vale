import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import "./style.css";
import { Overworld, BLOOM_LAYER } from "./world/overworld";
import { makeCritter } from "./game/battle";
import type { Critter } from "./game/battle";
import { SPECIES, STARTERS } from "./game/critters";
import { runBattle } from "./ui/battleUI";
import { openDex, attachHolo } from "./ui/dex";
import { openSummonLab } from "./ui/summonLab";
import { registerCustom } from "./game/customSpecies";
import type { CustomSpecies } from "./game/customSpecies";
import { ITEMS, SHOP_ORDER, starterBag, STARTER_SPRIGS, battleReward, add } from "./game/items";
import type { Bag, ItemId } from "./game/items";
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

// --- selective bloom: only emissive "lantern" heroes on BLOOM_LAYER glow ---
// Everything else is temporarily painted black for the bloom pass, then restored.
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_LAYER);
const darkMat = new THREE.MeshBasicMaterial({ color: 0x000000, fog: false });
const matCache = new Map<string, THREE.Material | THREE.Material[]>();
const spriteVis = new Map<string, boolean>();

function darkenNonBloom(obj: THREE.Object3D) {
  const asMesh = obj as THREE.Mesh;
  const asSprite = obj as THREE.Sprite;
  if (asMesh.isMesh && !bloomLayer.test(obj.layers)) {
    matCache.set(obj.uuid, asMesh.material);
    asMesh.material = darkMat;
  } else if (asSprite.isSprite && !bloomLayer.test(obj.layers)) {
    // sprites can't take the mesh dark material; hide them for the bloom pass
    spriteVis.set(obj.uuid, asSprite.visible);
    asSprite.visible = false;
  }
}
function restoreMaterial(obj: THREE.Object3D) {
  const cached = matCache.get(obj.uuid);
  if (cached) {
    (obj as THREE.Mesh).material = cached;
    matCache.delete(obj.uuid);
  }
  if (spriteVis.has(obj.uuid)) {
    (obj as THREE.Sprite).visible = spriteVis.get(obj.uuid)!;
    spriteVis.delete(obj.uuid);
  }
}

const renderPass = new RenderPass(world.scene, world.camera);

const bloomComposer = new EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(renderPass);
bloomComposer.addPass(
  new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.55, 0.0)
);

const mixPass = new ShaderPass(
  new THREE.ShaderMaterial({
    uniforms: {
      baseTexture: { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv;
      void main(){ gl_FragColor = texture2D(baseTexture, vUv) + vec4(1.0) * texture2D(bloomTexture, vUv); }`,
  }),
  "baseTexture"
);
mixPass.needsSwap = true;

const composer = new EffectComposer(renderer);
composer.addPass(renderPass);
composer.addPass(mixPass);
composer.addPass(new OutputPass());

function renderScene() {
  world.scene.traverse(darkenNonBloom);
  bloomComposer.render();
  world.scene.traverse(restoreMaterial);
  composer.render();
}

// --- player state ---
const team: Critter[] = [];
const caught: string[] = [];
const seen = new Set<string>(); // species ids encountered (dex)
const caughtIds = new Set<string>(); // species ids ever owned (dex)
const customOwned: CustomSpecies[] = []; // summoned critters (persisted + re-registered)
let sprigs = 0; // currency
const bag: Bag = {}; // item inventory

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
  hud.innerHTML = `<strong>Critter Vale</strong> · Sprout Hollow · 🌱 ${sprigs} Sprigs<br>Team: ${team
    .map((m) => `${m.species.name} Lv${m.level} (${m.hp}/${m.maxHp} HP)`)
    .join(", ")}<br>Caught: ${caught.length ? caught.join(", ") : "none yet"}<br><small>WASD / arrows · grass = wild critters · E talk/enter · green pad heals · C = Dex</small>`;
}

function persist() {
  if (!team.length) return;
  writeSave({
    team: team.map((m) => ({ id: m.species.id, level: m.level, xp: m.xp, hp: m.hp, quirk: m.quirk })),
    caught,
    pos: world.getPos(),
    seen: [...seen],
    caughtIds: [...caughtIds],
    custom: customOwned,
    sprigs,
    bag,
  });
}

world.onEncounter = ({ speciesId, level }) => {
  sfx("encounter");
  seen.add(speciesId); // dex: encountered
  const wild = makeCritter(speciesId, level);
  runBattle(
    team,
    [wild],
    (outcome, w) => {
      if (outcome === "lost") {
        handleFaint(); // whiteout screen then heal + respawn + persist + resume
        return;
      }
      if (outcome === "won" || outcome === "caught") {
        const reward = battleReward(level, false);
        sprigs += reward;
        showToast(`🌱 +${reward} Sprigs`);
      }
      if (outcome === "caught" && w) {
        if (team.length < MAX_TEAM) team.push(w); // caught critter joins the party
        if (!caught.includes(w.species.name)) caught.push(w.species.name);
        caughtIds.add(w.species.id);
      }
      syncDex(); // picks up evolutions + owned species
      drawHud(); // reflect XP / level-ups + catches
      persist();
      world.resume();
    },
    { bag }
  );
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
      if (outcome === "lost") {
        handleFaint();
        return;
      }
      if (outcome === "won") {
        beatenTrainers.add(npc.name);
        const reward = npc.challenge!.party.reduce((s, p) => s + battleReward(p.level, true), 0);
        sprigs += reward;
        showToast(`🏅 ${npc.challenge!.winLine} +${reward} Sprigs`);
      }
      syncDex();
      drawHud();
      persist();
      world.resume();
    },
    { trainerName: npc.name, bag }
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

// --- enterable buildings ---
world.onEnterBuilding = (b) => (b.kind === "post" ? openShop() : showInterior(b));

function openShop() {
  if (document.querySelector(".interior")) return;
  const root = document.createElement("div");
  root.className = "interior interior-post";
  const close = () => {
    root.remove();
    window.removeEventListener("keydown", onKey);
    world.resume();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  const render = () => {
    root.innerHTML = `
      <div class="io-panel shop-panel" style="--c:#e0b45b">
        <div class="io-head"><h2>Trading Post</h2><span class="shop-sprigs">🌱 ${sprigs}</span><button class="io-close" aria-label="Close">✕</button></div>
        <div class="shop-list">
          ${SHOP_ORDER.map((id) => {
            const it = ITEMS[id];
            const owned = bag[id] ?? 0;
            const afford = sprigs >= it.price;
            return `<div class="shop-item">
              <span class="shop-emoji">${it.emoji}</span>
              <span class="shop-info"><strong>${it.name}</strong><small>${it.desc}</small></span>
              <span class="shop-owned">x${owned}</span>
              <button class="shop-buy" data-id="${id}"${afford ? "" : " disabled"}>🌱 ${it.price}</button>
            </div>`;
          }).join("")}
        </div>
        <div class="io-actions"><button class="io-btn" data-act="leave">← Leave</button></div>
      </div>`;
    root.querySelector(".io-close")!.addEventListener("click", close);
    root.querySelector('[data-act="leave"]')!.addEventListener("click", close);
    root.querySelectorAll<HTMLButtonElement>(".shop-buy").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id as ItemId;
        if (sprigs < ITEMS[id].price) return;
        sprigs -= ITEMS[id].price;
        add(bag, id);
        persist();
        drawHud();
        sfx("levelup");
        render();
      });
    });
  };
  root.addEventListener("click", (e) => {
    if (e.target === root) close();
  });
  document.body.appendChild(root);
  render();
  window.addEventListener("keydown", onKey);
}

function restAtHome() {
  team.forEach((m) => (m.hp = m.maxHp));
  syncDex();
  drawHud();
  persist();
  showToast("😴 You rested. Your team is fully healed!");
  sfx("levelup");
}

function onSummoned(spec: CustomSpecies) {
  registerCustom(spec); // add to SPECIES / MOVESETS / sprite registry so the game can use it
  customOwned.push(spec);
  seen.add(spec.id);
  caughtIds.add(spec.id);
  if (!caught.includes(spec.name)) caught.push(spec.name);
  if (team.length < MAX_TEAM) team.push(makeCritter(spec.id, 7));
  drawHud();
  persist();
  showToast(`✨ ${spec.name} joined your party!`);
  sfx("levelup");
}

function showInterior(b: { name: string; kind: "home" | "lab" | "post"; color: number }) {
  if (document.querySelector(".interior")) return;
  const root = document.createElement("div");
  root.className = `interior interior-${b.kind}`;
  const close = () => {
    root.remove();
    window.removeEventListener("keydown", onKey);
    world.resume();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };

  let body = "";
  let extra = "";
  if (b.kind === "home") {
    body = "Home sweet home. A cozy bed and a warm hearth. Resting here restores your whole team.";
    extra = `<button class="io-btn io-primary" data-act="rest">😴 Rest &amp; Save</button>`;
  } else if (b.kind === "lab") {
    body = "Prof. Hollis's research lab hums with strange energy. Describe a critter and the lab will summon it into being.";
    extra = `<button class="io-btn io-primary" data-act="summon">✨ Summon a Critter</button>`;
  } else {
    body = 'The Trading Post. Racks of berries and gear line the walls. "Nothing new in stock today, tamer!"';
  }

  const hex = `#${b.color.toString(16).padStart(6, "0")}`;
  root.innerHTML = `
    <div class="io-panel" style="--c:${hex}">
      <div class="io-head"><h2>${b.name}</h2><button class="io-close" aria-label="Close">✕</button></div>
      <p class="io-body">${body}</p>
      <div class="io-actions">${extra}<button class="io-btn" data-act="leave">← Leave</button></div>
    </div>`;
  document.body.appendChild(root);

  root.querySelector(".io-close")!.addEventListener("click", close);
  root.addEventListener("click", (e) => {
    if (e.target === root) close();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const act = btn.dataset.act;
      if (act === "rest") {
        restAtHome();
        close();
      } else if (act === "summon") {
        close();
        openSummonLab(onSummoned);
      } else {
        close(); // leave
      }
    });
  });
  window.addEventListener("keydown", onKey);
}

// --- whiteout / faint screen (all critters down) ---
function showFaintScreen(onContinue: () => void) {
  const root = document.createElement("div");
  root.className = "faint";
  root.innerHTML = `
    <div class="faint-inner">
      <h2>Whiteout!</h2>
      <p>All your critters fainted. You hurry back to Sprout Hollow to recover...</p>
      <button class="faint-btn">Continue</button>
    </div>`;
  document.body.appendChild(root);
  const go = () => {
    root.remove();
    window.removeEventListener("keydown", onKey);
    onContinue();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  };
  root.querySelector(".faint-btn")!.addEventListener("click", go);
  window.addEventListener("keydown", onKey);
}

function handleFaint() {
  showFaintScreen(() => {
    team.forEach((m) => (m.hp = m.maxHp));
    world.setPos(-10, 5); // respawn by the home / healing pad
    syncDex();
    drawHud();
    persist();
    world.resume();
  });
}

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
  // Re-register summoned critters BEFORE rebuilding the team (team may reference their ids).
  for (const c of s.custom ?? []) {
    registerCustom(c);
    customOwned.push(c);
  }
  for (const c of s.team) {
    const m = makeCritter(c.id, c.level, c.quirk);
    m.xp = c.xp;
    if (typeof c.hp === "number") m.hp = Math.max(1, Math.min(m.maxHp, c.hp));
    team.push(m);
  }
  (s.seen ?? []).forEach((id) => seen.add(id));
  (s.caughtIds ?? []).forEach((id) => caughtIds.add(id));
  sprigs = s.sprigs ?? 0;
  Object.assign(bag, s.bag ?? {});
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
          return `<button class="starter holo" data-id="${id}" style="--c:${s.color}">
            <img src="/sprites/${id}.png" alt="">
            <span class="s-name">${s.name}</span>
            <span class="s-el">${s.element}</span>
          </button>`;
        }).join("")}
      </div>
      <p class="hint">Ember beats Leaf · Leaf beats Aqua · Aqua beats Ember</p>
    </div>`;
  document.body.appendChild(title);
  attachHolo(title.querySelector(".starters") as HTMLElement);

  title.querySelectorAll<HTMLButtonElement>(".starter").forEach((btn) => {
    btn.addEventListener("click", () => {
      team.push(makeCritter(btn.dataset.id!, 6));
      Object.assign(bag, starterBag()); // Prof. Hollis's starting kit
      sprigs = STARTER_SPRIGS;
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
  renderScene();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  bloomComposer.setSize(w, h);
  composer.setSize(w, h);
  world.onResize(w / h);
});
