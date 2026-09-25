import { create } from "zustand";
import type { Combatant } from "../core/types/schemas";
import { physicalDamage, applyMitigation } from "../core/engine/combatMath";
import { TurnManager } from "../core/engine/turnManager";
import { getStatsForAge } from "../core/engine/lifeCurve";
import heroData from "../data/heroes.json";
import enemyData from "../data/enemies.json";

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
    currentTp: 0,
    maxTp: data.maxTp,
  };
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
  phase: Phase;
  log: string[];
  turnManager: TurnManager;
  pendingEnemyDamage: number;

  init: () => void;
  heroAttack: () => void;
  heroSkill: () => void;
  heroMitigate: (tp: number) => void;
  skipMitigation: () => void;
  enemyTurn: () => void;
  ageUp: () => void;
};

export const useBattleStore = create<BattleState>((set, get) => ({
  hero: makeCombatant(heroData),
  enemy: makeCombatant(enemyData),
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
    set({
      hero,
      enemy,
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
    // Preserva el % de HP y TP actuales para que no sea injusto
    const hpRatio = hero.currentHp / hero.stats.hp;
    const tpRatio = hero.currentTp / hero.maxTp;
    set({
      hero: {
        ...hero,
        age: newAge,
        stats: newStats,
        currentHp: Math.max(1, Math.round(newStats.hp * hpRatio)),
        currentTp: Math.round(hero.maxTp * tpRatio),
      },
      log: [...log, `Cronos cumple ${newAge} años. Sus stats cambian.`],
    });
  },

  heroAttack: () => {
    const { hero, enemy, log } = get();
    const dmg = physicalDamage(hero, enemy, 1);
    const newTp = Math.min(hero.currentTp + 2, hero.maxTp);
    const updatedEnemy = {
      ...enemy,
      currentHp: Math.max(0, enemy.currentHp - dmg),
    };

    set({
      hero: { ...hero, currentTp: newTp },
      enemy: updatedEnemy,
      log: [...log, `${hero.name} ataca: ${dmg} daño. +2 TP.`],
    });

    if (updatedEnemy.currentHp <= 0) {
      set({ phase: "victory", log: [...get().log, "¡Victoria!"] });
      return;
    }
    get().enemyTurn();
  },

  heroSkill: () => {
    const { hero, enemy, log } = get();
    if (hero.currentTp < 3) {
      set({ log: [...log, "TP insuficiente."] });
      return;
    }
    const dmg = physicalDamage(hero, enemy, 2.5);
    const updatedEnemy = {
      ...enemy,
      currentHp: Math.max(0, enemy.currentHp - dmg),
    };

    set({
      hero: { ...hero, currentTp: hero.currentTp - 3 },
      enemy: updatedEnemy,
      log: [...log, `${hero.name} usa Corte Táctico: ${dmg} daño. -3 TP.`],
    });

    if (updatedEnemy.currentHp <= 0) {
      set({ phase: "victory", log: [...get().log, "¡Victoria!"] });
      return;
    }
    get().enemyTurn();
  },

  enemyTurn: () => {
    const { hero, enemy, log } = get();
    const rawDmg = physicalDamage(enemy, hero, 1);

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
    const { hero, pendingEnemyDamage, log } = get();
    const spent = Math.min(tp, hero.currentTp);
    const finalDmg = applyMitigation(pendingEnemyDamage, spent);
    const newHp = Math.max(0, hero.currentHp - finalDmg);

    set({
      hero: { ...hero, currentHp: newHp, currentTp: hero.currentTp - spent },
      phase: newHp <= 0 ? "defeat" : "hero_turn",
      pendingEnemyDamage: 0,
      log: [...log, `Mitigación con ${spent} TP: recibes ${finalDmg} daño.`],
    });
  },

  skipMitigation: () => {
    const { hero, pendingEnemyDamage, log } = get();
    const newHp = Math.max(0, hero.currentHp - pendingEnemyDamage);

    set({
      hero: { ...hero, currentHp: newHp },
      phase: newHp <= 0 ? "defeat" : "hero_turn",
      pendingEnemyDamage: 0,
      log: [...log, `Sin mitigar: recibes ${pendingEnemyDamage} daño.`],
    });
  },
}));