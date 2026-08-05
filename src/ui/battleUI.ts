// DOM battle screen with a PARTY: switch critters, faint = swap not instant loss,
// catch adds to your team. Type effectiveness, XP + evolution.
import type { Critter, Move } from "../game/battle";
import {
  moveDamage,
  movesFor,
  elementMultiplier,
  attemptCatch,
  catchChance,
  xpReward,
  gainXp,
  checkEvolution,
} from "../game/battle";
import { sfx } from "../audio";

export type BattleOutcome = "caught" | "won" | "lost" | "ran";

const MAX_TEAM = 6;

export function runBattle(
  party: Critter[],
  wild: Critter,
  onEnd: (outcome: BattleOutcome, wild: Critter) => void
) {
  let active = party.find((m) => m.hp > 0) ?? party[0];
  const wildMove = movesFor(wild.species.id)[0];

  const root = document.createElement("div");
  root.className = "battle";
  root.innerHTML = `
    <div class="arena">
      <div class="foe">
        <div class="nameplate">${wild.species.name} <small>Lv${wild.level}</small> · ${wild.species.element}</div>
        <div class="hpbar"><span id="foeHp"></span></div>
        <div class="mon-wrap"><img class="mon foe-mon" id="foeMon" src="/sprites/${wild.species.id}.png" alt=""></div>
      </div>
      <div class="ally">
        <div class="mon-wrap"><img class="mon ally-mon" id="allyMon" src="" alt=""></div>
        <div class="nameplate"></div>
        <div class="hpbar"><span id="allyHp"></span></div>
      </div>
    </div>
    <div class="log" id="log">A wild ${wild.species.name} appeared!</div>
    <div class="actions">
      <div class="moves">
        <button class="move" data-i="0"></button>
        <button class="move" data-i="1"></button>
      </div>
      <div class="menu">
        <button id="catch">Catch</button>
        <button id="switch">Switch</button>
        <button id="run">Run</button>
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
    el("#foeHp").style.width = `${Math.max(0, (wild.hp / wild.maxHp) * 100)}%`;
    el("#allyHp").style.width = `${Math.max(0, (active.hp / active.maxHp) * 100)}%`;
  };

  const renderActive = () => {
    (el("#allyMon") as HTMLImageElement).src = `/sprites/${active.species.id}.png`;
    el(".ally .nameplate").innerHTML =
      `${active.species.name} <small id="allyLv">Lv${active.level}</small> · ${active.species.element}`;
    const moves = movesFor(active.species.id);
    root.querySelectorAll<HTMLButtonElement>(".move").forEach((btn) => {
      const m = moves[Number(btn.dataset.i)];
      btn.innerHTML = `${m.name}<small>${m.element}</small>`;
    });
    drawHp();
  };
  renderActive();

  const buttons = () => root.querySelectorAll<HTMLButtonElement>(".actions button");
  const setBusy = (b: boolean) => {
    buttons().forEach((x) => (x.disabled = b));
    const canSwitch = party.filter((m) => m.hp > 0 && m !== active).length > 0;
    if (!b) (el("#switch") as HTMLButtonElement).disabled = !canSwitch;
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

  const finish = (outcome: BattleOutcome) => {
    setBusy(true);
    const banner = document.createElement("div");
    banner.className = "result " + outcome;
    banner.textContent =
      outcome === "lost"
        ? "Your team fainted! You hurry back to Sprout Hollow."
        : outcome === "won"
          ? "Victory!"
          : outcome === "caught"
            ? `${wild.species.name} joined your team!`
            : "Got away safely.";
    root.appendChild(banner);
    setTimeout(
      () => {
        root.remove();
        onEnd(outcome, wild);
      },
      outcome === "lost" || outcome === "caught" ? 1500 : 1000
    );
  };

  const grantXp = (via: string) => {
    const levels = gainXp(active, xpReward(wild));
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

  // --- switch menu ---
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
               <img src="/sprites/${m.species.id}.png" alt="">
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
        const mon = options.find((m) => m.species.id === id)!;
        active = mon;
        renderActive();
        log(`Go, ${active.species.name}!`);
        if (forced) setBusy(false);
        else setTimeout(foeTurn, 650); // switching costs your turn
      });
    });
  };

  const handleFaint = () => {
    if (party.some((m) => m.hp > 0)) {
      sfx("hit");
      openSwitchMenu(true);
    } else {
      log(`${active.species.name} fainted!`);
      finish("lost");
    }
  };

  const foeTurn = () => {
    const dmg = moveDamage(wild, active, wildMove);
    const mult = elementMultiplier(wildMove.element, active.species.element);
    active.hp = Math.max(0, active.hp - dmg);
    strike("ally", "allyMon", dmg);
    drawHp();
    if (active.hp <= 0) {
      log(`Wild ${wild.species.name} used ${wildMove.name}!${effLabel(mult)}`);
      setTimeout(handleFaint, 650);
    } else {
      log(`Wild ${wild.species.name} used ${wildMove.name}!${effLabel(mult)} Your move.`);
      setBusy(false);
    }
  };

  const useMove = (move: Move) => {
    setBusy(true);
    const dmg = moveDamage(active, wild, move);
    const mult = elementMultiplier(move.element, wild.species.element);
    wild.hp = Math.max(0, wild.hp - dmg);
    strike("foe", "foeMon", dmg);
    drawHp();
    log(`${active.species.name} used ${move.name}!${effLabel(mult)}`);
    if (wild.hp <= 0) {
      setTimeout(() => {
        grantXp(`Wild ${wild.species.name} fainted!`);
        setTimeout(() => finish("won"), 700);
      }, 500);
    } else {
      setTimeout(foeTurn, 700);
    }
  };

  root.querySelectorAll<HTMLButtonElement>(".move").forEach((btn) => {
    btn.addEventListener("click", () => useMove(movesFor(active.species.id)[Number(btn.dataset.i)]));
  });

  el("#switch").addEventListener("click", () => {
    setBusy(true);
    openSwitchMenu(false);
  });

  el("#catch").addEventListener("click", () => {
    setBusy(true);
    if (party.length >= MAX_TEAM) {
      log("Your team is full! You can't catch more right now.");
      setBusy(false);
      return;
    }
    const pct = Math.round(catchChance(wild) * 100);
    if (attemptCatch(wild)) {
      el("#foeMon").classList.add("caught");
      sfx("catch");
      setTimeout(() => {
        log(`Gotcha! ${wild.species.name} was caught! (${pct}% shot)`);
        setTimeout(() => finish("caught"), 700);
      }, 400);
    } else {
      log(`So close! ${wild.species.name} broke free (${pct}% shot).`);
      setTimeout(foeTurn, 650);
    }
  });

  el("#run").addEventListener("click", () => {
    log("Got away safely.");
    finish("ran");
  });

  setBusy(false);
}
