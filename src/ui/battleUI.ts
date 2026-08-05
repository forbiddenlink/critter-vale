// DOM battle screen. Move choice, type effectiveness, catching, XP + level-ups.
import type { Critter, Move } from "../game/battle";
import {
  moveDamage,
  movesFor,
  elementMultiplier,
  attemptCatch,
  catchChance,
  xpReward,
  gainXp,
} from "../game/battle";
import { sfx } from "../audio";

export type BattleOutcome = "caught" | "won" | "lost" | "ran";

export function runBattle(
  player: Critter,
  wild: Critter,
  onEnd: (outcome: BattleOutcome, wild: Critter) => void
) {
  const playerMoves = movesFor(player.species.id);
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
        <div class="mon-wrap"><img class="mon ally-mon" id="allyMon" src="/sprites/${player.species.id}.png" alt=""></div>
        <div class="nameplate">${player.species.name} <small id="allyLv">Lv${player.level}</small> · ${player.species.element}</div>
        <div class="hpbar"><span id="allyHp"></span></div>
      </div>
    </div>
    <div class="log" id="log">A wild ${wild.species.name} appeared!</div>
    <div class="actions">
      <div class="moves">
        <button class="move" data-i="0">${playerMoves[0].name}<small>${playerMoves[0].element}</small></button>
        <button class="move" data-i="1">${playerMoves[1].name}<small>${playerMoves[1].element}</small></button>
      </div>
      <div class="menu">
        <button id="catch">Catch</button>
        <button id="run">Run</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // encounter flash
  const flashEl = document.createElement("div");
  flashEl.className = "flash";
  document.body.appendChild(flashEl);
  setTimeout(() => flashEl.remove(), 550);

  const el = (sel: string) => root.querySelector(sel) as HTMLElement;
  const log = (msg: string) => (el("#log").textContent = msg);
  const drawHp = () => {
    el("#foeHp").style.width = `${Math.max(0, (wild.hp / wild.maxHp) * 100)}%`;
    el("#allyHp").style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
  };
  drawHp();

  const buttons = root.querySelectorAll("button");
  const setBusy = (b: boolean) => buttons.forEach((x) => ((x as HTMLButtonElement).disabled = b));

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
    setTimeout(() => {
      root.remove();
      onEnd(outcome, wild);
    }, 1000);
  };

  const grantXp = (via: string) => {
    const levels = gainXp(player, xpReward(wild));
    if (levels > 0) {
      el("#allyLv").textContent = `Lv${player.level}`;
      flash("allyMon", "levelup");
      sfx("levelup");
      log(`${via} ${player.species.name} grew to Lv${player.level}!`);
    } else {
      log(via);
    }
  };

  const foeTurn = () => {
    const dmg = moveDamage(wild, player, wildMove);
    const mult = elementMultiplier(wildMove.element, player.species.element);
    player.hp = Math.max(0, player.hp - dmg);
    strike("ally", "allyMon", dmg);
    drawHp();
    if (player.hp <= 0) {
      log(`${player.species.name} fainted! You flee back to town...`);
      finish("lost");
    } else {
      log(`Wild ${wild.species.name} used ${wildMove.name}!${effLabel(mult)} Your move.`);
      setBusy(false);
    }
  };

  const useMove = (move: Move) => {
    setBusy(true);
    const dmg = moveDamage(player, wild, move);
    const mult = elementMultiplier(move.element, wild.species.element);
    wild.hp = Math.max(0, wild.hp - dmg);
    strike("foe", "foeMon", dmg);
    drawHp();
    if (wild.hp <= 0) {
      log(`${player.species.name} used ${move.name}!${effLabel(mult)}`);
      setTimeout(() => {
        grantXp(`Wild ${wild.species.name} fainted!`);
        setTimeout(() => finish("won"), 700);
      }, 500);
    } else {
      log(`${player.species.name} used ${move.name}!${effLabel(mult)}`);
      setTimeout(foeTurn, 700);
    }
  };

  root.querySelectorAll<HTMLButtonElement>(".move").forEach((btn) => {
    btn.addEventListener("click", () => useMove(playerMoves[Number(btn.dataset.i)]));
  });

  el("#catch").addEventListener("click", () => {
    setBusy(true);
    const pct = Math.round(catchChance(wild) * 100);
    if (attemptCatch(wild)) {
      el("#foeMon").classList.add("caught");
      sfx("catch");
      setTimeout(() => {
        grantXp(`Gotcha! ${wild.species.name} was caught! (${pct}% shot)`);
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
}
