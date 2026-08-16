// DOM battle screen. Player party vs a foe side that may also be a party (trainer battles).
// Wild battles: foe is one critter, Catch + Run allowed.
// Trainer battles: foe is a party, no Catch/Run, foe swaps in the next critter on faint.
import type { Critter, Move } from "../game/battle";
import {
  moveDamage,
  movesFor,
  elementMultiplier,
  attemptCatch,
  effectiveCatchChance,
  xpReward,
  gainXp,
  checkEvolution,
} from "../game/battle";
import { spriteUrl } from "../game/customSpecies";
import { ITEMS, consume, bagCount } from "../game/items";
import type { Bag, ItemId } from "../game/items";
import { quirkDef } from "../game/traits";
import { sfx } from "../audio";

export type BattleOutcome = "caught" | "won" | "lost" | "ran";

export interface BattleOpts {
  trainerName?: string; // presence = trainer battle (foe party, no catch/run)
  bag?: Bag; // shared inventory; battle consumes items from it
}

const MAX_TEAM = 6;

/** Neon spark burst on a successful catch. Skipped when the user prefers reduced motion. */
function catchConfetti() {
  if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.createElement("div");
  layer.className = "confetti";
  const colors = ["#ff7a45", "#39c6ff", "#6be36b", "#ffe07a"];
  for (let i = 0; i < 28; i++) {
    const spark = document.createElement("i");
    const ang = Math.random() * Math.PI * 2;
    const dist = 120 + Math.random() * 180;
    spark.style.setProperty("--tx", `${(Math.cos(ang) * dist).toFixed(0)}px`);
    spark.style.setProperty("--ty", `${(Math.sin(ang) * dist).toFixed(0)}px`);
    spark.style.setProperty("--r", `${(Math.random() * 720 - 360).toFixed(0)}deg`);
    spark.style.setProperty("--p", colors[i % colors.length]);
    spark.style.setProperty("--d", `${(Math.random() * 0.12).toFixed(2)}s`);
    layer.appendChild(spark);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1300);
}

export function runBattle(
  party: Critter[],
  foes: Critter[],
  onEnd: (outcome: BattleOutcome, caught: Critter | null) => void,
  opts: BattleOpts = {}
) {
  const isTrainer = !!opts.trainerName;
  const bag: Bag = opts.bag ?? {};
  let active = party.find((m) => m.hp > 0) ?? party[0];
  let foe = foes.find((m) => m.hp > 0) ?? foes[0];

  const foeLabel = (m: Critter) =>
    isTrainer ? `${opts.trainerName}'s ${m.species.name}` : `Wild ${m.species.name}`;

  const root = document.createElement("div");
  root.className = "battle";
  root.innerHTML = `
    <div class="arena">
      <div class="foe">
        <div class="nameplate"></div>
        <div class="hpbar"><span id="foeHp"></span></div>
        <div class="mon-wrap"><img class="mon foe-mon" id="foeMon" src="" alt=""></div>
      </div>
      <div class="ally">
        <div class="mon-wrap"><img class="mon ally-mon" id="allyMon" src="" alt=""></div>
        <div class="nameplate"></div>
        <div class="hpbar"><span id="allyHp"></span></div>
      </div>
    </div>
    <div class="log" id="log">${isTrainer ? `${opts.trainerName} wants to battle!` : `A wild ${foe.species.name} appeared!`}</div>
    <div class="actions">
      <div class="moves">
        <button class="move" data-i="0"></button>
        <button class="move" data-i="1"></button>
      </div>
      <div class="menu">
        <button id="bag">Bag</button>
        <button id="switch">Switch</button>
        <button id="run"${isTrainer ? " hidden" : ""}>Run</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const flashEl = document.createElement("div");
  flashEl.className = "flash";
  document.body.appendChild(flashEl);
  setTimeout(() => flashEl.remove(), 550);

  const el = (sel: string) => root.querySelector(sel) as HTMLElement;
  const log = (msg: string) => (el("#log").textContent = msg);
  const drawHp = () => {
    el("#foeHp").style.width = `${Math.max(0, (foe.hp / foe.maxHp) * 100)}%`;
    el("#allyHp").style.width = `${Math.max(0, (active.hp / active.maxHp) * 100)}%`;
  };

  const renderFoe = () => {
    (el("#foeMon") as HTMLImageElement).src = spriteUrl(foe.species.id);
    const fq = quirkDef(foe.quirk);
    el(".foe .nameplate").innerHTML =
      `${foe.species.name} <small>Lv${foe.level}</small> · ${foe.species.element}${fq.emoji ? ` <span title="${fq.name}: ${fq.desc}">${fq.emoji}</span>` : ""}`;
    drawHp();
  };
  const renderActive = () => {
    (el("#allyMon") as HTMLImageElement).src = spriteUrl(active.species.id);
    const aq = quirkDef(active.quirk);
    el(".ally .nameplate").innerHTML =
      `${active.species.name} <small id="allyLv">Lv${active.level}</small> · ${active.species.element}${aq.emoji ? ` <span title="${aq.name}: ${aq.desc}">${aq.emoji}</span>` : ""}`;
    const moves = movesFor(active.species.id);
    root.querySelectorAll<HTMLButtonElement>(".move").forEach((btn) => {
      const m = moves[Number(btn.dataset.i)];
      btn.innerHTML = `${m.name}<small>${m.element}</small>`;
    });
    drawHp();
  };
  renderFoe();
  renderActive();

  const setBusy = (b: boolean) => {
    root.querySelectorAll<HTMLButtonElement>(".actions button").forEach((x) => (x.disabled = b));
    if (!b) {
      const canSwitch = party.filter((m) => m.hp > 0 && m !== active).length > 0;
      (el("#switch") as HTMLButtonElement).disabled = !canSwitch;
    }
  };

  const flash = (id: string, cls = "hit") => {
    const m = el("#" + id);
    m.classList.remove(cls);
    void m.offsetWidth;
    m.classList.add(cls);
  };
  const shake = () => {
    root.classList.remove("shake");
    void root.offsetWidth;
    root.classList.add("shake");
  };
  const popDamage = (side: "foe" | "ally", dmg: number) => {
    const n = document.createElement("div");
    n.className = "dmg";
    n.textContent = "-" + dmg;
    el("." + side).appendChild(n);
    setTimeout(() => n.remove(), 950);
  };
  const strike = (side: "foe" | "ally", monId: string, dmg: number) => {
    flash(monId);
    popDamage(side, dmg);
    shake();
    sfx("hit");
  };
  const effLabel = (mult: number) =>
    mult > 1 ? " It's super effective!" : mult < 1 ? " It's not very effective..." : "";

  // Quirk modifiers (per-individual traits). Pure battle math stays in battle.ts; this
  // is the battle-layer that reads quirks and adjusts the final numbers.
  const adjustDamage = (attacker: Critter, defender: Critter, raw: number) => {
    const a = quirkDef(attacker.quirk);
    const d = quirkDef(defender.quirk);
    const dmg = Math.max(1, Math.round(raw * a.dealtMult * d.takenMult - d.takenFlat));
    const recoil = d.recoilFrac > 0 ? Math.max(1, Math.round(dmg * d.recoilFrac)) : 0; // thornskin
    return { dmg, recoil };
  };
  const endTurnHeal = (c: Critter) => {
    const q = quirkDef(c.quirk);
    if (q.healFrac > 0 && c.hp > 0 && c.hp < c.maxHp) {
      c.hp = Math.min(c.maxHp, c.hp + Math.max(1, Math.round(c.maxHp * q.healFrac)));
      drawHp();
    }
  };

  const finish = (outcome: BattleOutcome, caught: Critter | null) => {
    setBusy(true);
    const banner = document.createElement("div");
    banner.className = "result " + outcome;
    banner.textContent =
      outcome === "lost"
        ? "Your team fainted! You hurry back to Sprout Hollow."
        : outcome === "won"
          ? isTrainer
            ? `You defeated ${opts.trainerName}!`
            : "Victory!"
          : outcome === "caught"
            ? `${caught?.species.name} joined your team!`
            : "Got away safely.";
    root.appendChild(banner);
    setTimeout(
      () => {
        root.remove();
        onEnd(outcome, caught);
      },
      outcome === "lost" || outcome === "caught" || (outcome === "won" && isTrainer) ? 1600 : 1000
    );
  };

  const grantXp = (via: string) => {
    const levels = gainXp(active, Math.round(xpReward(foe) * quirkDef(active.quirk).xpMult));
    if (levels > 0) {
      el("#allyLv").textContent = `Lv${active.level}`;
      flash("allyMon", "levelup");
      sfx("levelup");
      log(`${via} ${active.species.name} grew to Lv${active.level}!`);
      const evolvedTo = checkEvolution(active);
      if (evolvedTo) {
        renderActive();
        flash("allyMon", "levelup");
        sfx("levelup");
        log(`What? ${active.species.name} evolved!`);
      }
    } else {
      log(via);
    }
  };

  // player switch menu
  const openSwitchMenu = (forced: boolean) => {
    const menu = document.createElement("div");
    menu.className = "switch-menu";
    const options = party.filter((m) => m.hp > 0 && m !== active);
    menu.innerHTML =
      `<div class="switch-title">${forced ? `${active.species.name} fainted! Send out...` : "Choose a critter"}</div>` +
      options
        .map(
          (m) =>
            `<button data-id="${m.species.id}" style="--c:${m.species.color}">
               <img src="${spriteUrl(m.species.id)}" alt="">
               <span>${m.species.name} <small>Lv${m.level}</small></span>
               <span class="sw-hp">${m.hp}/${m.maxHp}</span>
             </button>`
        )
        .join("") +
      (forced ? "" : `<button class="sw-cancel" data-id="">Back</button>`);
    root.appendChild(menu);
    menu.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        menu.remove();
        if (!id) {
          setBusy(false);
          return;
        }
        active = options.find((m) => m.species.id === id)!;
        renderActive();
        log(`Go, ${active.species.name}!`);
        if (forced) setBusy(false);
        else setTimeout(foeTurn, 650); // switching costs your turn
      });
    });
  };

  const playerFaint = () => {
    if (party.some((m) => m.hp > 0)) {
      sfx("hit");
      openSwitchMenu(true);
    } else {
      log(`${active.species.name} fainted!`);
      finish("lost", null);
    }
  };

  const foeFaint = () => {
    const next = foes.find((m) => m.hp > 0);
    if (isTrainer && next) {
      foe = next;
      renderFoe();
      log(`${opts.trainerName} sent out ${foe.species.name}!`);
      setBusy(false);
    } else {
      grantXp(`${foeLabel(foe)} fainted!`);
      setTimeout(() => finish("won", null), 700);
    }
  };

  const foeTurn = () => {
    const move = movesFor(foe.species.id)[0]; // foe uses its STAB move
    const { dmg, recoil } = adjustDamage(foe, active, moveDamage(foe, active, move));
    const mult = elementMultiplier(move.element, active.species.element);
    active.hp = Math.max(0, active.hp - dmg);
    strike("ally", "allyMon", dmg);
    if (recoil > 0 && foe.hp > 0) foe.hp = Math.max(0, foe.hp - recoil); // thornskin bites back
    endTurnHeal(foe);
    drawHp();
    if (active.hp <= 0) {
      log(`${foeLabel(foe)} used ${move.name}!${effLabel(mult)}`);
      setTimeout(playerFaint, 650);
    } else if (foe.hp <= 0) {
      log(`${foeLabel(foe)} used ${move.name}, but recoil took it down!`);
      setTimeout(foeFaint, 650);
    } else {
      log(`${foeLabel(foe)} used ${move.name}!${effLabel(mult)} Your move.`);
      setBusy(false);
    }
  };

  const useMove = (move: Move) => {
    setBusy(true);
    const { dmg, recoil } = adjustDamage(active, foe, moveDamage(active, foe, move));
    const mult = elementMultiplier(move.element, foe.species.element);
    foe.hp = Math.max(0, foe.hp - dmg);
    strike("foe", "foeMon", dmg);
    log(`${active.species.name} used ${move.name}!${effLabel(mult)}`);
    if (recoil > 0 && active.hp > 0) active.hp = Math.max(0, active.hp - recoil); // foe's thornskin
    endTurnHeal(active);
    drawHp();
    if (foe.hp <= 0) setTimeout(foeFaint, 550);
    else if (active.hp <= 0) setTimeout(playerFaint, 650); // died to recoil
    else setTimeout(foeTurn, 700);
  };

  root.querySelectorAll<HTMLButtonElement>(".move").forEach((btn) => {
    btn.addEventListener("click", () => useMove(movesFor(active.species.id)[Number(btn.dataset.i)]));
  });

  el("#switch").addEventListener("click", () => {
    setBusy(true);
    openSwitchMenu(false);
  });

  // throw a ball (wild only): consumes it, then attempts the catch
  const throwBall = (id: ItemId) => {
    if (party.length >= MAX_TEAM) {
      log("Your team is full! You can't catch more right now.");
      setBusy(false);
      return;
    }
    if (!consume(bag, id)) {
      setBusy(false);
      return;
    }
    const ball = ITEMS[id];
    const pct = Math.round(effectiveCatchChance(foe, ball.power) * 100);
    if (attemptCatch(foe, Math.random, ball.power)) {
      el("#foeMon").classList.add("caught");
      sfx("catch");
      catchConfetti();
      setTimeout(() => {
        log(`Gotcha! ${foe.species.name} was caught! (${pct}% shot)`);
        setTimeout(() => finish("caught", foe), 700);
      }, 400);
    } else {
      log(`So close! ${foe.species.name} broke free (${pct}% shot).`);
      setTimeout(foeTurn, 650);
    }
  };

  // use a potion on the active critter (costs a turn)
  const usePotion = (id: ItemId) => {
    if (active.hp >= active.maxHp) {
      log(`${active.species.name} is already at full HP.`);
      setBusy(false);
      return;
    }
    if (!consume(bag, id)) {
      setBusy(false);
      return;
    }
    const heal = ITEMS[id].power;
    active.hp = Math.min(active.maxHp, active.hp + heal);
    drawHp();
    log(`${active.species.name} recovered ${heal} HP!`);
    sfx("levelup");
    setTimeout(foeTurn, 650);
  };

  // revive a chosen fainted party member (costs a turn)
  const useRevive = (id: ItemId) => {
    const fainted = party.filter((m) => m.hp <= 0);
    if (!fainted.length) {
      log("No fainted critter to revive.");
      setBusy(false);
      return;
    }
    const menu = document.createElement("div");
    menu.className = "switch-menu";
    menu.innerHTML =
      `<div class="switch-title">Revive which critter?</div>` +
      fainted
        .map(
          (m) =>
            `<button data-id="${m.species.id}" style="--c:${m.species.color}">
               <img src="${spriteUrl(m.species.id)}" alt="">
               <span>${m.species.name} <small>Lv${m.level}</small></span>
             </button>`
        )
        .join("") +
      `<button class="sw-cancel" data-id="">Back</button>`;
    root.appendChild(menu);
    menu.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rid = btn.dataset.id;
        menu.remove();
        if (!rid) {
          setBusy(false);
          return;
        }
        const target = fainted.find((m) => m.species.id === rid)!;
        if (!consume(bag, id)) {
          setBusy(false);
          return;
        }
        target.hp = Math.max(1, Math.round(target.maxHp * ITEMS[id].power));
        log(`${target.species.name} was revived!`);
        sfx("levelup");
        setTimeout(foeTurn, 650);
      });
    });
  };

  const openBagMenu = () => {
    const usable = (Object.keys(bag) as ItemId[]).filter((id) => {
      const n = bag[id] ?? 0;
      if (n <= 0) return false;
      if (ITEMS[id].kind === "ball" && isTrainer) return false; // no catching trainers' critters
      return true;
    });
    const menu = document.createElement("div");
    menu.className = "switch-menu bag-menu";
    if (!usable.length) {
      menu.innerHTML =
        `<div class="switch-title">Your bag is empty</div>` +
        `<button class="sw-cancel" data-id="">Back</button>`;
    } else {
      menu.innerHTML =
        `<div class="switch-title">Bag</div>` +
        usable
          .map((id) => {
            const it = ITEMS[id];
            const extra =
              it.kind === "ball"
                ? ` <small>${Math.round(effectiveCatchChance(foe, it.power) * 100)}% catch</small>`
                : "";
            return `<button data-id="${id}" style="--c:#39c6ff">
                <span class="bag-emoji">${it.emoji}</span>
                <span>${it.name} <small>x${bag[id]}</small>${extra}</span>
              </button>`;
          })
          .join("") +
        `<button class="sw-cancel" data-id="">Back</button>`;
    }
    root.appendChild(menu);
    menu.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id as ItemId | "";
        menu.remove();
        if (!id) {
          setBusy(false);
          return;
        }
        const kind = ITEMS[id].kind;
        if (kind === "ball") throwBall(id);
        else if (kind === "heal") usePotion(id);
        else useRevive(id);
      });
    });
  };

  el("#bag").addEventListener("click", () => {
    setBusy(true);
    if (bagCount(bag) === 0) {
      log("Your bag is empty. Buy items at the Trading Post.");
      setBusy(false);
      return;
    }
    openBagMenu();
  });

  if (!isTrainer) {
    el("#run").addEventListener("click", () => {
      log("Got away safely.");
      finish("ran", null);
    });
  }

  setBusy(false);
}
