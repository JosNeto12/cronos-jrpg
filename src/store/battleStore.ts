import { create } from "zustand";
import type { Combatant, Move } from "../core/types/schemas";
import {
  physicalDamage,
  magicalDamage,
  applyMitigation,
} from "../core/engine/combatMath";
import { TurnManager } from "../core/engine/turnManager";
import {
  getStatsForAge,
  pcrRegen,
  atpRegen,
  collapseDamage,
} from "../core/engine/lifeCurve";
import {
  loadMoveOrder,
  saveMoveOrder,
  clearMoveOrder,
  reconcileOrder,
} from "../core/persistence";
import heroData from "../data/heroes.json";
import enemyData from "../data/enemies.json";
import movesData from "../data/moves.json";

const MOVES: Record<string, Move> = movesData as Record<string, Move>;
const INITIAL_KNOWN: string[] = (heroData as any).knownMoves ?? [];

function makeCombatant(data: any): Combatant {
  const baseStats = { ...data.stats };
  const age = data.age ?? 30;
  const stats = getStatsForAge(baseStats, age);
  return {
    id: data.id,
    name: data.name,
    side: data.side as "hero" | "enemy",
    element: data.element,
    weaknesses: data.weaknesses,
    resistances: data.resistances,
    baseStats,
    stats,
    age,
    currentHp: stats.hp,
    currentPcr: stats.pcr,
    currentAtp: stats.atp,
    currentTp: 0,
    maxTp: data.maxTp,
  };
}

function startTurn(c: Combatant, log: string[]): Combatant {
  let actor = c;

  if (actor.currentAtp === 0) {
    const dmg = collapseDamage(actor.stats.hp);
    actor = { ...actor, currentHp: Math.max(0, actor.currentHp - dmg) };
    log.push(
      `Colapso: ${actor.name} pierde ${dmg} HP por agotamiento de ATP.`
    );
  }

  const pr = pcrRegen(actor.stats.pcr);
  const ar = atpRegen(actor.stats.atp);
  actor = {
    ...actor,
    currentPcr: Math.min(actor.stats.pcr, actor.currentPcr + pr),
    currentAtp: Math.min(actor.stats.atp, actor.currentAtp + ar),
  };

  return actor;
}

type Phase =
  | "hero_turn"
  | "enemy_turn"
  | "mitigation_prompt"
  | "victory"
  | "defeat";

type BattleState = {
  hero: Combatant;
  enemy: Combatant;
  knownMoves: string[];
  moveOrder: string[];
  showMoveManager: boolean;
  phase: Phase;
  log: string[];
  turnManager: TurnManager;
  pendingEnemyDamage: number;

  init: () => void;
  executeMove: (moveId: string) => void;
  heroMitigate: (tp: number) => void;
  skipMitigation: () => void;
  enemyTurn: () => void;
  ageUp: () => void;
  reorderMove: (moveId: string, direction: "up" | "down") => void;
  resetMoveOrder: () => void;
  toggleMoveManager: () => void;
};

const initialOrder = reconcileOrder(INITIAL_KNOWN, loadMoveOrder());

export const useBattleStore = create<BattleState>((set, get) => ({
  hero: makeCombatant(heroData),
  enemy: makeCombatant(enemyData),
  knownMoves: INITIAL_KNOWN,
  moveOrder: initialOrder,
  showMoveManager: false,
  phase: "hero_turn",
  log: [],
  turnManager: new TurnManager([
    makeCombatant(heroData),
    makeCombatant(enemyData),
  ]),
  pendingEnemyDamage: 0,

  init: () => {
    const hero = makeCombatant(heroData);
    const enemy = makeCombatant(enemyData);
    const order = reconcileOrder(INITIAL_KNOWN, loadMoveOrder());
    set({
      hero,
      enemy,
      knownMoves: INITIAL_KNOWN,
      moveOrder: order,
      showMoveManager: false,
      phase: "hero_turn",
      log: ["¡Comienza el combate!"],
      turnManager: new TurnManager([hero, enemy]),
      pendingEnemyDamage: 0,
    });
  },

  ageUp: () => {
    const { hero, log } = get();
    const newAge = Math.min(hero.age + 1, 90);
    const newStats = getStatsForAge(hero.baseStats, newAge);

    const hpRatio = hero.currentHp / hero.stats.hp;
    const pcrRatio = hero.currentPcr / hero.stats.pcr;
    const atpRatio = hero.currentAtp / hero.stats.atp;

    set({
      hero: {
        ...hero,
        age: newAge,
        stats: newStats,
        currentHp: Math.max(1, Math.round(newStats.hp * hpRatio)),
        currentPcr: Math.round(newStats.pcr * pcrRatio),
        currentAtp: Math.round(newStats.atp * atpRatio),
      },
      log: [...log, `${hero.name} cumple ${newAge} años. Sus stats cambian.`],
    });
  },

  reorderMove: (moveId: string, direction: "up" | "down") => {
    const { moveOrder } = get();
    const idx = moveOrder.indexOf(moveId);
    if (idx < 0) return;

    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= moveOrder.length) return;

    const newOrder = [...moveOrder];
    [newOrder[idx], newOrder[target]] = [newOrder[target], newOrder[idx]];

    saveMoveOrder(newOrder);
    set({ moveOrder: newOrder });
  },

  resetMoveOrder: () => {
    clearMoveOrder();
    const { knownMoves, log } = get();
    const order = [...knownMoves];
    saveMoveOrder(order);
    set({
      moveOrder: order,
      log: [...log, "Orden de movimientos restablecido."],
    });
  },

  toggleMoveManager: () => {
    set({ showMoveManager: !get().showMoveManager });
  },

  executeMove: (moveId: string) => {
    const move = MOVES[moveId];
    if (!move) {
      const { log } = get();
      set({ log: [...log, `Movimiento desconocido: ${moveId}`] });
      return;
    }

    const { hero, enemy, log } = get();

    if (move.pcrCost > hero.currentPcr) {
      set({ log: [...log, `PCr insuficiente para ${move.name}.`] });
      return;
    }
    if (move.atpCost > hero.currentAtp) {
      set({ log: [...log, `ATP insuficiente para ${move.name}.`] });
      return;
    }
    if (move.tpCost > hero.currentTp) {
      set({ log: [...log, `TP insuficiente para ${move.name}.`] });
      return;
    }

    let updatedHero: Combatant = {
      ...hero,
      currentPcr: hero.currentPcr - move.pcrCost,
      currentAtp: hero.currentAtp - move.atpCost,
      currentTp: hero.currentTp - move.tpCost + move.tpGain,
    };

    let updatedEnemy: Combatant = { ...enemy };
    const newLog: string[] = [];

    if (move.type === "physical") {
      const dmg = physicalDamage(hero, enemy, move.element, move.power);
      updatedEnemy.currentHp = Math.max(0, enemy.currentHp - dmg);
      newLog.push(
        `${hero.name} usa ${move.name}: ${dmg} daño. +${move.tpGain} TP.`
      );
    } else if (move.type === "magical") {
      const dmg = magicalDamage(hero, enemy, move.element, move.power);
      updatedEnemy.currentHp = Math.max(0, enemy.currentHp - dmg);
      newLog.push(
        `${hero.name} usa ${move.name}: ${dmg} daño. +${move.tpGain} TP.`
      );
    } else if (move.type === "support") {
      if (move.id === "breath") {
        const pr = pcrRegen(hero.stats.pcr);
        const ar = atpRegen(hero.stats.atp);
        updatedHero.currentPcr = Math.min(
          hero.stats.pcr,
          updatedHero.currentPcr + pr
        );
        updatedHero.currentAtp = Math.min(
          hero.stats.atp,
          updatedHero.currentAtp + ar
        );
        newLog.push(
          `${hero.name} toma aliento: +${pr} PCr, +${ar} ATP, -${move.tpCost} TP.`
        );
      } else if (move.id === "focus") {
        newLog.push(`${hero.name} se concentra: +${move.tpGain} TP.`);
      } else {
        newLog.push(`${hero.name} usa ${move.name}.`);
      }
    }

    updatedHero.currentTp = Math.max(
      0,
      Math.min(updatedHero.maxTp, updatedHero.currentTp)
    );

    set({
      hero: updatedHero,
      enemy: updatedEnemy,
      log: [...log, ...newLog],
    });

    if (updatedEnemy.currentHp <= 0) {
      set({ phase: "victory", log: [...get().log, "¡Victoria!"] });
      return;
    }
    get().enemyTurn();
  },

  enemyTurn: () => {
    const { hero, enemy } = get();
    const log = [...get().log];

    const rawDmg = physicalDamage(enemy, hero, enemy.element, 1);

    set({
      phase: "mitigation_prompt",
      pendingEnemyDamage: rawDmg,
      log: [
        ...log,
        `${enemy.name} prepara un ataque (${rawDmg} daño potencial).`,
      ],
    });
  },

  heroMitigate: (tp: number) => {
    const { hero, pendingEnemyDamage } = get();
    const log = [...get().log];
    const spent = Math.min(tp, hero.currentTp);
    const finalDmg = applyMitigation(pendingEnemyDamage, spent);
    const newHp = Math.max(0, hero.currentHp - finalDmg);

    let updatedHero: Combatant = {
      ...hero,
      currentHp: newHp,
      currentTp: hero.currentTp - spent,
    };
    log.push(`Mitigación con ${spent} TP: recibes ${finalDmg} daño.`);

    if (newHp <= 0) {
      set({ hero: updatedHero, phase: "defeat", pendingEnemyDamage: 0, log });
      return;
    }

    updatedHero = startTurn(updatedHero, log);
    if (updatedHero.currentHp <= 0) {
      set({ hero: updatedHero, phase: "defeat", pendingEnemyDamage: 0, log });
      return;
    }

    set({
      hero: updatedHero,
      phase: "hero_turn",
      pendingEnemyDamage: 0,
      log,
    });
  },

  skipMitigation: () => {
    const { hero, pendingEnemyDamage } = get();
    const log = [...get().log];
    const newHp = Math.max(0, hero.currentHp - pendingEnemyDamage);

    let updatedHero: Combatant = { ...hero, currentHp: newHp };
    log.push(`Sin mitigar: recibes ${pendingEnemyDamage} daño.`);

    if (newHp <= 0) {
      set({ hero: updatedHero, phase: "defeat", pendingEnemyDamage: 0, log });
      return;
    }

    updatedHero = startTurn(updatedHero, log);
    if (updatedHero.currentHp <= 0) {
      set({ hero: updatedHero, phase: "defeat", pendingEnemyDamage: 0, log });
      return;
    }

    set({
      hero: updatedHero,
      phase: "hero_turn",
      pendingEnemyDamage: 0,
      log,
    });
  },
}));