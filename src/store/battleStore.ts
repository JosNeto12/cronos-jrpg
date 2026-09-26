import { create } from "zustand";
import type {
  Combatant,
  Move,
  PlayerProgress,
  SkillBranch,
} from "../core/types/schemas";
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
  loadProgress,
  saveProgress,
} from "../core/persistence";
import {
  SKILL_NODES,
  computeStatBonuses,
  applyStatBonuses,
  canBuyNode,
  emptyBranchInvestment,
  evaluateMidlifeCrisis,
  vivenciasForNextYear,
  isMilestone,
  isBranchUnlockedByAge,
  MIDLIFE_CRISIS_AGE,
  MAX_AGE,
} from "../core/progression";
import heroData from "../data/heroes.json";
import enemyData from "../data/enemies.json";
import movesData from "../data/moves.json";

const MOVES: Record<string, Move> = movesData as Record<string, Move>;
const HERO_DEFAULT_MOVES: string[] = (heroData as any).knownMoves ?? [];
const HERO_DEFAULT_AGE: number = (heroData as any).age ?? 20;

function defaultProgress(): PlayerProgress {
  return {
    vivencias: 0,
    seedsAvailable: 0,
    age: HERO_DEFAULT_AGE,
    unlockedNodes: [],
    knownMoves: [...HERO_DEFAULT_MOVES],
    branchInvestment: emptyBranchInvestment(),
    driedBranches: [],
    midlifeCrisisResolved: false,
    warning45Shown: false,
    warning49Shown: false,
  };
}

function buildHero(progress: PlayerProgress): Combatant {
  const rawBase = (heroData as any).stats;
  const baseStats = { ...rawBase };
  const { statBonuses, tpBonus } = computeStatBonuses(progress.unlockedNodes);
  const effectiveBase = applyStatBonuses(baseStats, statBonuses);
  const stats = getStatsForAge(effectiveBase, progress.age);

  return {
    id: (heroData as any).id,
    name: (heroData as any).name,
    side: "hero",
    element: (heroData as any).element,
    weaknesses: (heroData as any).weaknesses,
    resistances: (heroData as any).resistances,
    baseStats: effectiveBase,
    stats,
    age: progress.age,
    currentHp: stats.hp,
    currentPcr: stats.pcr,
    currentAtp: stats.atp,
    currentTp: 0,
    maxTp: (heroData as any).maxTp + tpBonus,
  };
}

function makeEnemy(data: any): Combatant {
  const baseStats = { ...data.stats };
  const age = data.age ?? 30;
  const stats = getStatsForAge(baseStats, age);
  return {
    id: data.id,
    name: data.name,
    side: "enemy",
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
    log.push(`Colapso: ${actor.name} pierde ${dmg} HP por agotamiento de ATP.`);
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
  progress: PlayerProgress;
  moveOrder: string[];
  showMoveManager: boolean;
  showSkillTree: boolean;
  phase: Phase;
  log: string[];
  turnManager: TurnManager;
  pendingEnemyDamage: number;

  init: () => void;
  executeMove: (moveId: string) => void;
  heroMitigate: (tp: number) => void;
  skipMitigation: () => void;
  enemyTurn: () => void;
  reorderMove: (moveId: string, direction: "up" | "down") => void;
  resetMoveOrder: () => void;
  toggleMoveManager: () => void;
  toggleSkillTree: () => void;
  buyNode: (nodeId: string) => void;
  resetProgress: () => void;
  resolveMidlifeCrisis: (sacrifice: SkillBranch | null) => void;
};

const savedProgress = loadProgress() ?? defaultProgress();

export const useBattleStore = create<BattleState>((set, get) => {
  const hero = buildHero(savedProgress);
  const enemy = makeEnemy(enemyData);
  const order = reconcileOrder(savedProgress.knownMoves, loadMoveOrder());

  return {
    hero,
    enemy,
    progress: savedProgress,
    moveOrder: order,
    showMoveManager: false,
    showSkillTree: false,
    phase: "hero_turn",
    log: [],
    turnManager: new TurnManager([hero, enemy]),
    pendingEnemyDamage: 0,

    init: () => {
      const current = get().progress;
      const newHero = buildHero(current);
      const newEnemy = makeEnemy(enemyData);
      const newOrder = reconcileOrder(current.knownMoves, loadMoveOrder());
      set({
        hero: newHero,
        enemy: newEnemy,
        moveOrder: newOrder,
        showMoveManager: false,
        showSkillTree: false,
        phase: "hero_turn",
        log: ["¡Comienza el combate!"],
        turnManager: new TurnManager([newHero, newEnemy]),
        pendingEnemyDamage: 0,
      });
    },

    buyNode: (nodeId: string) => {
      const { progress, hero, log, moveOrder } = get();
      const check = canBuyNode(
        nodeId,
        progress.unlockedNodes,
        progress.seedsAvailable,
        progress.age,
        progress.driedBranches
      );
      if (!check.ok) {
        set({ log: [...log, `No puedes comprar: ${check.reason}`] });
        return;
      }
      const node = SKILL_NODES[nodeId];
      const newInvestment = { ...progress.branchInvestment };
      newInvestment[node.branch] =
        (newInvestment[node.branch] ?? 0) + node.cost;

      const newProgress: PlayerProgress = {
        ...progress,
        seedsAvailable: progress.seedsAvailable - node.cost,
        unlockedNodes: [...progress.unlockedNodes, nodeId],
        branchInvestment: newInvestment,
      };

      const newKnownMoves = [...progress.knownMoves];
      for (const eff of node.effects) {
        if (eff.type === "learn_move" && !newKnownMoves.includes(eff.moveId)) {
          newKnownMoves.push(eff.moveId);
        }
      }
      newProgress.knownMoves = newKnownMoves;

      const newHero = buildHero(newProgress);
      newHero.currentHp = Math.min(hero.currentHp, newHero.stats.hp);
      newHero.currentPcr = Math.min(hero.currentPcr, newHero.stats.pcr);
      newHero.currentAtp = Math.min(hero.currentAtp, newHero.stats.atp);
      newHero.currentTp = Math.min(hero.currentTp, newHero.maxTp);

      const newOrder = reconcileOrder(newKnownMoves, moveOrder);
      saveMoveOrder(newOrder);
      saveProgress(newProgress);

      set({
        hero: newHero,
        progress: newProgress,
        moveOrder: newOrder,
        log: [...log, `Árbol de Vida: desbloqueado ${node.name}.`],
      });
    },

    resolveMidlifeCrisis: (sacrifice: SkillBranch | null) => {
      const { progress, log } = get();
      if (progress.midlifeCrisisResolved) return;

      const { autoDried, selectable, safeguardBranch } =
        evaluateMidlifeCrisis(progress.branchInvestment);

      let dried = [...autoDried];
      if (safeguardBranch) {
        // Todas estaban bajo el umbral; salvamos la más invertida
        dried = ALL_BRANCHES.filter((b) => b !== safeguardBranch);
      } else if (sacrifice) {
        dried.push(sacrifice);
      } else if (selectable.length > 0) {
        // No debería llegar aquí (la UI fuerza elegir)
        return;
      }

      const newProgress: PlayerProgress = {
        ...progress,
        driedBranches: dried,
        midlifeCrisisResolved: true,
      };
      saveProgress(newProgress);

      const driedNames = dried.join(", ");
      set({
        progress: newProgress,
        log: [
          ...log,
          `Crisis de mediana edad: las ramas de ${driedNames} se han secado.`,
        ],
      });
    },

    resetProgress: () => {
      const fresh = defaultProgress();
      saveProgress(fresh);
      clearMoveOrder();
      const newHero = buildHero(fresh);
      const newEnemy = makeEnemy(enemyData);
      const order = reconcileOrder(fresh.knownMoves, null);
      saveMoveOrder(order);
      set({
        hero: newHero,
        enemy: newEnemy,
        progress: fresh,
        moveOrder: order,
        showSkillTree: false,
        phase: "hero_turn",
        log: ["Progreso reiniciado."],
        turnManager: new TurnManager([newHero, newEnemy]),
        pendingEnemyDamage: 0,
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
      const { progress, log } = get();
      const order = [...progress.knownMoves];
      saveMoveOrder(order);
      set({
        moveOrder: order,
        log: [...log, "Orden de movimientos restablecido."],
      });
    },

    toggleMoveManager: () => set({ showMoveManager: !get().showMoveManager }),
    toggleSkillTree: () => set({ showSkillTree: !get().showSkillTree }),

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
        const { progress } = get();
        const gained = (enemyData as any).vivencias ?? 0;

        // 1. Sumar Vivencias. Comprobar subida de edad.
        let vivencias = progress.vivencias + gained;
        let age = progress.age;
        let seeds = progress.seedsAvailable;
        const logs: string[] = [];

        while (age < MAX_AGE) {
          const needed = vivenciasForNextYear(age);
          if (vivencias >= needed) {
            vivencias -= needed;
            age += 1;
            logs.push(`Cronos cumple ${age} años.`);
            if (isMilestone(age)) {
              seeds += 1;
              logs.push(`Hito alcanzado. +1 Semilla.`);
            }
          } else {
            break;
          }
        }

        // Avisos previos a la crisis
        let w45 = progress.warning45Shown;
        let w49 = progress.warning49Shown;
        if (age >= 45 && !w45) {
          logs.push(
            "Cronos siente el peso del tiempo. Algunas ramas podrían no sobrevivir."
          );
          w45 = true;
        }
        if (age >= 49 && !w49) {
          logs.push(
            "A Cronos le queda poco para los 50. Una decisión se acerca."
          );
          w49 = true;
        }

        const newProgress: PlayerProgress = {
          ...progress,
          vivencias,
          seedsAvailable: seeds,
          age,
          warning45Shown: w45,
          warning49Shown: w49,
        };
        saveProgress(newProgress);

        const victoryLog = [`¡Victoria! +${gained} Vivencias.`, ...logs];

        const rebuiltHero = age !== progress.age ? buildHero(newProgress) : updatedHero;

        set({
          hero: rebuiltHero,
          progress: newProgress,
          phase: "victory",
          log: [...get().log, ...victoryLog],
        });
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
  };
});