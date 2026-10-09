import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import "./style.css";
import { installOverlayAccessibility } from "./ui/accessibility";
import { openFieldGuide } from "./ui/fieldGuide";
import { spriteUrl } from "./game/customSpecies";
import { Overworld, BLOOM_LAYER } from "./world/overworld";
import type { Npc } from "./world/overworld";
import { makeCritter } from "./game/battle";
import type { Critter } from "./game/battle";
import { SPECIES, STARTERS } from "./game/critters";
import type { Element } from "./game/critters";
import { runBattle } from "./ui/battleUI";
import { openDex, attachHolo } from "./ui/dex";
import { openSummonLab } from "./ui/summonLab";
import { openFusionLab } from "./ui/fusionLab";
import { registerCustom } from "./game/customSpecies";
import type { CustomSpecies } from "./game/customSpecies";
import { ITEMS, SHOP_ORDER, starterBag, STARTER_SPRIGS, battleReward, add } from "./game/items";
import type { Bag, ItemId } from "./game/items";
import { sfx, startMusic, toggleMusic } from "./audio";
import { readSave, writeSave, clearSave } from "./game/save";
import type { SaveData } from "./game/save";

const app = document.querySelector<HTMLElement>("#app")!;
installOverlayAccessibility();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, matchMedia("(max-width: 760px)").matches ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.75;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
app.appendChild(renderer.domElement);

const world = new Overworld(window.innerWidth / window.innerHeight);
world.active = false; // frozen until a starter is chosen
world.inputBlocked = () => !!document.querySelector(".title, .dex, .interior, .summon, .dialog, .faint, .victory, .field-guide, .battle");

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
const crests = new Set<Element>(); // Warden crests earned (Ember/Aqua/Leaf)
let isChampion = false; // beat Champion Sol

function syncDex() {
  for (const m of team) {
    seen.add(m.species.id);
    caughtIds.add(m.species.id);
  }
}

const MAX_TEAM = 6;

const hud = document.createElement("div");
hud.className = "hud";
hud.addEventListener("keydown", (event: KeyboardEvent): void => {
  if (event.key.startsWith("Arrow")) event.stopPropagation();
});
document.body.appendChild(hud);

const mute = document.createElement("button");
mute.className = "mute";
mute.textContent = "Sound on";
mute.setAttribute("aria-label", "Sound on: toggle music");
mute.setAttribute("aria-pressed", "true");
mute.title = "Toggle music";
mute.addEventListener("click", () => {
  const enabled = toggleMusic();
  mute.textContent = enabled ? "Sound on" : "Sound off";
  mute.setAttribute("aria-label", `${mute.textContent}: toggle music`);
  mute.setAttribute("aria-pressed", String(enabled));
});
document.body.appendChild(mute);
function drawHud() {
  if (!team.length) return;
  const objective = isChampion ? "Champion of the Vale. Keep discovering." : crests.size === 3 ? "Challenge Champion Sol at the Wellspring." : caughtIds.size < 2 ? "Find your next partner in the tall grass." : `Earn the Warden crests · ${crests.size} / 3`;
  hud.innerHTML = `<div class="hud-heading"><strong>Critter Vale<span aria-hidden="true">✳</span></strong><span class="hud-location">SPROUT HOLLOW</span></div>
    <div class="hud-resources"><span>${sprigs} <small>Sprigs</small></span><span>${caughtIds.size} <small>caught</small></span><span>${crests.size}/3 <small>crests</small></span></div>
    <div class="hud-party-title">YOUR TEAM <span>${team.length} / ${MAX_TEAM}</span></div>
    <div class="hud-party" role="region" aria-label="Your party" tabindex="0">${team.map((m) => `<div class="hud-critter"><img src="${spriteUrl(m.species.id)}" alt="" width="42" height="42"><div><span>${m.species.name}<small>Lv ${m.level}</small></span><div class="hud-hp" role="meter" aria-label="${m.species.name} HP" aria-valuemin="0" aria-valuemax="${m.maxHp}" aria-valuenow="${m.hp}"><i style="width:${Math.max(0, m.hp / m.maxHp * 100)}%"></i></div></div><small>${m.hp}/${m.maxHp}</small></div>`).join("")}</div>
    <div class="hud-objective"><span class="eyebrow">NEXT IN YOUR JOURNAL</span><p>${objective}</p></div>
    <details class="hud-notes"><summary>Trail notes &amp; controls</summary><p>Caught: ${caught.length ? caught.join(", ") : "none yet"}</p><small>WASD / arrows · grass = wild critters · E talk/enter · green pad heals · C = Dex</small><p>Ember ${crests.has("Ember") ? "✓" : "—"} · Aqua ${crests.has("Aqua") ? "✓" : "—"} · Leaf ${crests.has("Leaf") ? "✓" : "—"}</p></details>`;
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
    crests: [...crests],
    champion: isChampion,
    beaten: [...beatenTrainers],
  });
}

world.partyTopLevel = () => team.reduce((top, m) => Math.max(top, m.level), 1);
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
function startTrainer(npc: Npc) {
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
      let championWin = false;
      if (outcome === "won") {
        beatenTrainers.add(npc.name);
        const reward = npc.challenge!.party.reduce((s, p) => s + battleReward(p.level, true), 0);
        sprigs += reward;
        if (npc.warden) {
          crests.add(npc.warden.crest);
          showToast(`🏅 You earned the ${npc.warden.crest} Crest! +${reward} Sprigs`);
        } else if (npc.champion) {
          isChampion = true;
          championWin = true;
        } else {
          showToast(`🏅 ${npc.challenge!.winLine} +${reward} Sprigs`);
        }
      }
      syncDex();
      drawHud();
      persist();
      if (championWin) showVictory();
      else world.resume();
    },
    { trainerName: npc.name, bag, restrict: npc.warden?.restrict }
  );
}

// NPC dialog
world.onInteract = (npc) => {
  const d = document.createElement("div");
  d.className = "dialog";
  d.tabIndex = 0;
  let i = 0;
  // The Champion is sealed until you hold all three Crests.
  const gated = !!npc.champion && crests.size < 3;
  const lines = gated
    ? ["The path to the Wellspring is sealed.", "Return when you hold all three Crests: Ember, Aqua, and Leaf."]
    : npc.lines;
  const render = () => {
    d.innerHTML = `<div class="dialog-box"><div class="dialog-name">${npc.name}</div><p>${lines[i]}</p><div class="dialog-cont">Continue → space / click${i < lines.length - 1 ? "" : " to close"}</div></div>`;
  };
  const afterDialog = () => {
    if (!gated && npc.challenge && !beatenTrainers.has(npc.name)) startTrainer(npc);
    else world.resume();
  };
  const close = () => {
    d.remove();
    window.removeEventListener("keydown", onKey);
    afterDialog();
  };
  const advance = () => {
    i += 1;
    if (i >= lines.length) close();
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
  t.setAttribute("role", "status");
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
        <span class="eyebrow">SPROUT HOLLOW / PROVISIONS</span>
        <div class="io-head"><h2>Trading Post</h2><span class="shop-sprigs">🌱 ${sprigs}</span><button class="io-close" aria-label="Close">✕</button></div>
        <p class="shop-help">Stock up for the trail. Win battles to earn more Sprigs.</p>
        <div class="shop-list">
          ${SHOP_ORDER.map((id) => {
            const it = ITEMS[id];
            const owned = bag[id] ?? 0;
            const afford = sprigs >= it.price;
            return `<div class="shop-item">
              <span class="shop-emoji">${it.emoji}</span>
              <span class="shop-info"><strong>${it.name}</strong><small>${it.desc}</small></span>
              <span class="shop-owned">x${owned}</span>
              <button class="shop-buy" data-id="${id}" aria-label="Buy ${it.name} for ${it.price} Sprigs"${afford ? "" : " disabled"}>🌱 ${it.price}</button>
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
        showToast(`${ITEMS[id].name} added to your bag.`);
        root.querySelector<HTMLButtonElement>(`.shop-buy[data-id="${id}"]:not(:disabled)`)?.focus();
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

const FUSION_COST = 80; // Sprigs to fuse two critters into a hybrid
const SUMMON_COST = 60; // Sprigs per summon: each one is a real paid image generation

// The labs charge when a generation starts and refund only if it fails.
const wallet = {
  balance: () => sprigs,
  spend(amount: number) {
    if (sprigs < amount) return false;
    sprigs -= amount;
    drawHud();
    persist();
    return true;
  },
  refund(amount: number) {
    sprigs += amount;
    drawHud();
    persist();
  },
};

function onFused(a: Critter, b: Critter, spec: CustomSpecies) {
  registerCustom(spec);
  customOwned.push(spec);
  const level = Math.max(a.level, b.level);
  for (const parent of [a, b]) {
    const i = team.indexOf(parent);
    if (i >= 0) team.splice(i, 1); // the two parents merge into the hybrid
  }
  team.push(makeCritter(spec.id, level, a.quirk)); // hybrid inherits parent A's quirk
  seen.add(spec.id);
  caughtIds.add(spec.id);
  if (!caught.includes(spec.name)) caught.push(spec.name);
  drawHud();
  persist();
  showToast(`🌀 ${spec.name} was born from the Wellspring!`);
  sfx("levelup");
}

function onSummoned(spec: CustomSpecies) {
  registerCustom(spec); // add to SPECIES / MOVESETS / sprite registry so the game can use it
  customOwned.push(spec);
  seen.add(spec.id);
  caughtIds.add(spec.id);
  if (!caught.includes(spec.name)) caught.push(spec.name);
  const joinsParty = team.length < MAX_TEAM;
  if (joinsParty) team.push(makeCritter(spec.id, 7));
  drawHud();
  persist();
  showToast(joinsParty ? `${spec.name} joined your party!` : `${spec.name} was kept in your Critter-Dex. Your party is full.`);
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
    body = "Prof. Hollis's research lab hums with strange energy. Summon a new critter from the Wellspring, or fuse two of yours into a hybrid.";
    extra = `<button class="io-btn io-primary" data-act="summon">✨ Summon a Critter</button><button class="io-btn io-primary" data-act="fuse">🌀 Fuse Critters</button>`;
  } else {
    body = 'The Trading Post. Racks of berries and gear line the walls. "Nothing new in stock today, tamer!"';
  }

  const hex = `#${b.color.toString(16).padStart(6, "0")}`;
  root.innerHTML = `
    <div class="io-panel" style="--c:${hex}">
      <span class="eyebrow">SPROUT HOLLOW / ${b.kind === "home" ? "REST STOP" : "RESEARCH"}</span>
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
        openSummonLab(onSummoned, wallet, SUMMON_COST, () => team.length >= MAX_TEAM);
      } else if (act === "fuse") {
        close();
        openFusionLab({ party: team, wallet, cost: FUSION_COST, onFused });
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
      <span class="eyebrow">A MOMENT TO REST</span>
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

// --- victory screen (beat the Champion) ---
function showVictory() {
  const root = document.createElement("div");
  root.className = "victory";
  root.innerHTML = `
    <div class="victory-inner">
      <div class="victory-crown">👑</div>
      <span class="eyebrow">THREE CRESTS. A NEW CHAPTER.</span>
      <h2>Champion of Critter Vale!</h2>
      <p>You bested Champion Sol and every Warden of the Vale. The Wellspring is yours to explore, endlessly.</p>
      <button class="victory-btn">Continue</button>
    </div>`;
  document.body.appendChild(root);
  const go = () => {
    root.remove();
    window.removeEventListener("keydown", onKey);
    world.resume();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      go();
    }
  };
  root.querySelector(".victory-btn")!.addEventListener("click", go);
  window.addEventListener("keydown", onKey);
  sfx("levelup");
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
reset.textContent = "New game";
reset.title = "New game (erases progress)";
reset.setAttribute("aria-label", "New game (erases progress)");
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
dexBtn.textContent = "Critter-Dex";
dexBtn.title = "Critter-Dex (C)";
dexBtn.setAttribute("aria-label", "Open Critter-Dex");
dexBtn.addEventListener("click", () => openDex(seen, caughtIds));
document.body.appendChild(dexBtn);
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "c" && team.length && !world.inputBlocked()) {
    openDex(seen, caughtIds);
  }
});

const guideBtn = document.createElement("button");
guideBtn.className = "mute guidebtn";
guideBtn.textContent = "Field guide";
guideBtn.title = "Field guide (H)";
guideBtn.addEventListener("click", openFieldGuide);
const tools = document.createElement("nav");
tools.className = "game-tools";
tools.setAttribute("aria-label", "Game tools");
tools.append(dexBtn, guideBtn, mute, reset);
document.body.appendChild(tools);
window.addEventListener("keydown", (event: KeyboardEvent): void => {
  if (event.key.toLowerCase() === "h" && team.length && !world.inputBlocked()) openFieldGuide();
});

const touchControls = document.createElement("nav");
touchControls.className = "touch-controls";
touchControls.setAttribute("aria-label", "Movement controls");
touchControls.innerHTML = `<div class="dpad">${[["w", "↑", "Move north"], ["a", "←", "Move west"], ["s", "↓", "Move south"], ["d", "→", "Move east"]].map(([key, symbol, label]) => `<button data-key="${key}" aria-label="${label}">${symbol}</button>`).join("")}</div><button class="touch-interact" aria-label="E Interact with nearby person or building">E<span>Interact</span></button>`;
touchControls.querySelectorAll<HTMLButtonElement>("[data-key]").forEach((button: HTMLButtonElement): void => {
  const key = button.dataset.key!;
  button.addEventListener("pointerdown", (event: PointerEvent): void => {
    event.preventDefault(); button.setPointerCapture(event.pointerId); world.setMovementKey(key, true);
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) {
    button.addEventListener(name, (): void => world.setMovementKey(key, false));
  }
});
touchControls.querySelector(".touch-interact")!.addEventListener("click", (): void => world.interact());
document.body.appendChild(touchControls);

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
  (s.crests ?? []).forEach((c) => crests.add(c));
  isChampion = s.champion ?? false;
  (s.beaten ?? []).forEach((n) => beatenTrainers.add(n));
  syncDex();
  world.setPos(s.pos.x, s.pos.z);
  world.resume();
  drawHud();
  armMusicOnGesture();
}

// --- title screen + starter select ---
function showTitle(notice?: string) {
  const title = document.createElement("div");
  title.className = "title";
  title.innerHTML = `
    <div class="title-inner">
      <header class="title-masthead"><span class="wordmark">CV<span class="brand-sprout" aria-hidden="true">✳</span></span><span>THE VALE FIELD JOURNAL</span><span class="edition">A creature-collecting adventure</span></header>
      <div class="title-intro">
        <div><span class="eyebrow">YOUR ADVENTURE STARTS SMALL</span><h1>Critter <em>Vale.</em></h1></div>
        <p>A curious world. A little wild company.<br>Explore the Vale, raise your team, and find<br class="desktop-break"> a partner for every adventure.</p>
      </div>
      <div class="starter-heading"><h2>Choose your first partner</h2><span>THREE ELEMENTS. ONE FIRST FRIEND.</span></div>
      <span class="title-scroll-note">Scroll to meet all three partners ↓</span>
      ${notice ? `<p class="notice" role="alert">${notice}</p>` : ""}
      <div class="starters">
        ${STARTERS.map((id, index) => {
          const s = SPECIES[id];
          const strength = s.element === "Ember" ? "Leaf" : s.element === "Aqua" ? "Ember" : "Aqua";
          const temperament = s.element === "Ember" ? "A spark of possibility." : s.element === "Aqua" ? "Go with the current." : "Room to grow wild.";
          return `<button class="starter holo" data-id="${id}" style="--c:${s.color}">
            <span class="specimen-index">PARTNER 0${index + 1}<span class="s-el">${s.element}</span></span>
            <span class="specimen-art"><img src="/sprites/${id}-title.webp" width="240" height="240" alt="" fetchpriority="high"></span>
            <span class="specimen-copy"><span class="s-name">${s.name}</span><span class="s-description">${temperament}</span></span>
            <span class="starter-facts"><span>Strong against ${strength}</span><span>Lv 6</span></span>
            <span class="starter-cta">Begin with ${s.name}<span aria-hidden="true">↗</span></span>
          </button>`;
        }).join("")}
      </div>
      <footer class="title-footer"><p class="hint">Ember beats Leaf · Leaf beats Aqua · Aqua beats Ember</p><p><kbd>WASD</kbd> move <span>·</span> <kbd>E</kbd> interact <span>·</span> Touch controls on mobile</p><small>Progress saves in this browser. No account needed.</small></footer>
    </div>`;
  document.body.appendChild(title);
  attachHolo(title.querySelector(".starters") as HTMLElement);
  title.querySelector<HTMLButtonElement>(".starter")?.focus(); // keyboard players land on the first partner, not the mute button

  title.querySelectorAll<HTMLButtonElement>(".starter").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (team.length) return;
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

const UNREADABLE_SAVE = "Your saved game could not be read, so we are starting fresh.";

/** Undo whatever a half-finished resume put in memory, so the title screen starts clean. */
function resetInMemoryState() {
  team.length = 0;
  caught.length = 0;
  seen.clear();
  caughtIds.clear();
  customOwned.length = 0;
  crests.clear();
  beatenTrainers.clear();
  for (const k of Object.keys(bag)) delete bag[k as ItemId];
  sprigs = 0;
  isChampion = false;
}

const saved = readSave();
if (saved.status === "ok") {
  try {
    resumeFromSave(saved.data);
  } catch (err) {
    console.error("resumeFromSave failed", err);
    resetInMemoryState();
    showTitle(UNREADABLE_SAVE);
  }
} else {
  showTitle(saved.status === "corrupt" ? UNREADABLE_SAVE : undefined);
}


const prompt = document.createElement("button");
prompt.className = "prompt";
prompt.hidden = true;
prompt.addEventListener("click", () => world.interact());
document.body.appendChild(prompt);

let last = performance.now();
function loop(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  world.update(dt);
  const hint = world.hint();
  if (hint) {
    prompt.hidden = false;
    prompt.textContent = hint;
    prompt.classList.add("show");
  } else {
    prompt.classList.remove("show");
    prompt.hidden = true;
  }
  if (!document.hidden && !document.querySelector(".title, .battle, .faint, .victory")) renderScene();
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
