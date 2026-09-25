import { create } from "zustand";
import type { Combatant } from "../core/types/schemas";
import { physicalDamage, applyMitigation } from "../core/engine/combatMath";
import { TurnManager } from "../core/engine/turnManager";
import {
  getStatsForAge,
  pcrRegen,
  atpRegen,
  collapseDamage,
} from "../core/engine/lifeCurve";
import heroData from "../data/heroes.json";
import enemyData from "../data/enemies.json";

const ATTACK_PCR_COST = 2;
const SKILL_PCR_COST = 4;
const SKILL_TP_COST = 3;
const REST_TP_COST = 1;

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
  phase: Phase;
  log: string[];
  turnManager: TurnManager;
  pendingEnemyDamage: number;

  init: () => void;
  heroAttack: () => void;
  heroSkill: () => void;
  heroRest: () => void;
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

  heroAttack: () => {
    const { hero, enemy, log } = get();
    if (hero.currentPcr < ATTACK_PCR_COST) {
      set({ log: [...log, "Fatiga: PCr insuficiente para atacar."] });
      return;
    }

    const dmg = physicalDamage(hero, enemy, 1);
    const newTp = Math.min(hero.currentTp + 2, hero.maxTp);
    const updatedEnemy = {
      ...enemy,
      currentHp: Math.max(0, enemy.currentHp - dmg),
    };

    set({
      hero: {
        ...hero,
        currentTp: newTp,
        currentPcr: hero.currentPcr - ATTACK_PCR_COST,
      },
      enemy: updatedEnemy,
      log: [
        ...log,
        `${hero.name} ataca: ${dmg} daño. -${ATTACK_PCR_COST} PCr. +2 TP.`,
      ],
    });

    if (updatedEnemy.currentHp <= 0) {
      set({ phase: "victory", log: [...get().log, "¡Victoria!"] });
      return;
    }
    get().enemyTurn();
  },

  heroSkill: () => {
    const { hero, enemy, log } = get();
    if (hero.currentPcr < SKILL_PCR_COST) {
      set({ log: [...log, "Fatiga: PCr insuficiente para Corte Táctico."] });
      return;
    }
    if (hero.currentTp < SKILL_TP_COST) {
      set({ log: [...log, "TP insuficiente."] });
      return;
    }

    const dmg = physicalDamage(hero, enemy, 2.5);
    const updatedEnemy = {
      ...enemy,
      currentHp: Math.max(0, enemy.currentHp - dmg),
    };

    set({
      hero: {
        ...hero,
        currentPcr: hero.currentPcr - SKILL_PCR_COST,
        currentTp: hero.currentTp - SKILL_TP_COST,
      },
      enemy: updatedEnemy,
      log: [
        ...log,
        `${hero.name} usa Corte Táctico: ${dmg} daño. -${SKILL_PCR_COST} PCr. -${SKILL_TP_COST} TP.`,
      ],
    });

    if (updatedEnemy.currentHp <= 0) {
      set({ phase: "victory", log: [...get().log, "¡Victoria!"] });
      return;
    }
    get().enemyTurn();
  },

  heroRest: () => {
    const { hero, log } = get();

    const pr = pcrRegen(hero.stats.pcr);
    const ar = atpRegen(hero.stats.atp);
    const newPcr = Math.min(hero.stats.pcr, hero.currentPcr + pr);
    const newAtp = Math.min(hero.stats.atp, hero.currentAtp + ar);
    const newTp = Math.max(0, hero.currentTp - REST_TP_COST);

    const updatedHero: Combatant = {
      ...hero,
      currentPcr: newPcr,
      currentAtp: newAtp,
      currentTp: newTp,
    };

    set({
      hero: updatedHero,
      log: [
        ...log,
        `${hero.name} toma aliento: +${pr} PCr, +${ar} ATP, -${REST_TP_COST} TP.`,
      ],
    });

    get().enemyTurn();
  },

  enemyTurn: () => {
    const { hero, enemy } = get();
    const log = [...get().log];

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