import type {
  SkillNode,
  StatBlock,
  SkillBranch,
  BranchInvestment,
} from "./types/schemas";
import skillTreeData from "../data/skillTree.json";

export const MAX_AGE = 90;
export const BRANCH_MIN_INVESTMENT = 3;
export const MIDLIFE_CRISIS_AGE = 50;

export const SKILL_NODES: Record<string, SkillNode> = skillTreeData as Record<
  string,
  SkillNode
>;

export const ALL_BRANCHES: SkillBranch[] = [
  "vitalidad",
  "fuerza",
  "sabiduria",
  "tecnica",
];

/** Edad mínima para desbloquear cada rama. */
export const BRANCH_UNLOCK_AGE: Record<SkillBranch, number> = {
  vitalidad: 20,
  fuerza: 20,
  sabiduria: 25,
  tecnica: 30,
};

/** Hitos: +1 Semilla cada uno. */
export const MILESTONE_AGES = [25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];

/**
 * Curva humana del coste de Vivencias por año.
 * Sube hasta los 50, baja después.
 */
const VIVENCIAS_BY_AGE: { age: number; cost: number }[] = [
  { age: 20, cost: 100 },
  { age: 25, cost: 130 },
  { age: 30, cost: 170 },
  { age: 35, cost: 210 },
  { age: 40, cost: 240 },
  { age: 45, cost: 255 },
  { age: 50, cost: 260 },
  { age: 55, cost: 250 },
  { age: 60, cost: 230 },
  { age: 65, cost: 210 },
  { age: 70, cost: 190 },
  { age: 75, cost: 170 },
  { age: 80, cost: 150 },
  { age: 85, cost: 135 },
  { age: 90, cost: 120 },
];

export function vivenciasForNextYear(age: number): number {
  const pts = VIVENCIAS_BY_AGE;
  if (age <= pts[0].age) return pts[0].cost;
  if (age >= pts[pts.length - 1].age) return pts[pts.length - 1].cost;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (age >= a.age && age <= b.age) {
      const t = (age - a.age) / (b.age - a.age);
      return Math.round(a.cost + (b.cost - a.cost) * t);
    }
  }
  return 100;
}

export function isMilestone(age: number): boolean {
  return MILESTONE_AGES.includes(age);
}

export function isBranchUnlockedByAge(
  branch: SkillBranch,
  age: number
): boolean {
  return age >= BRANCH_UNLOCK_AGE[branch];
}

export function computeStatBonuses(unlockedNodes: string[]): {
  statBonuses: Partial<StatBlock>;
  tpBonus: number;
  learnedMoves: string[];
} {
  const statBonuses: Partial<Record<keyof StatBlock, number>> = {};
  let tpBonus = 0;
  const learnedMoves: string[] = [];

  for (const nodeId of unlockedNodes) {
    const node = SKILL_NODES[nodeId];
    if (!node) continue;
    for (const effect of node.effects) {
      if (effect.type === "stat") {
        if (effect.stat === "tp") {
          tpBonus += effect.value;
        } else {
          const key = effect.stat as keyof StatBlock;
          statBonuses[key] = (statBonuses[key] ?? 0) + effect.value;
        }
      } else if (effect.type === "learn_move") {
        learnedMoves.push(effect.moveId);
      }
    }
  }

  return { statBonuses, tpBonus, learnedMoves };
}

export function applyStatBonuses(
  base: StatBlock,
  bonuses: Partial<StatBlock>
): StatBlock {
  const result = { ...base };
  (Object.keys(bonuses) as (keyof StatBlock)[]).forEach((key) => {
    result[key] = (result[key] ?? 0) + (bonuses[key] ?? 0);
  });
  return result;
}

export function canBuyNode(
  nodeId: string,
  unlockedNodes: string[],
  seedsAvailable: number,
  age: number,
  driedBranches: SkillBranch[]
): { ok: boolean; reason?: string } {
  const node = SKILL_NODES[nodeId];
  if (!node) return { ok: false, reason: "Nodo desconocido" };
  if (unlockedNodes.includes(nodeId)) {
    return { ok: false, reason: "Ya desbloqueado" };
  }
  if (driedBranches.includes(node.branch)) {
    return { ok: false, reason: "Rama seca" };
  }
  if (!isBranchUnlockedByAge(node.branch, age)) {
    return {
      ok: false,
      reason: `Disponible a los ${BRANCH_UNLOCK_AGE[node.branch]}`,
    };
  }
  if (node.cost > seedsAvailable) {
    return { ok: false, reason: `Requiere ${node.cost} Semilla(s)` };
  }
  for (const req of node.requires) {
    if (!unlockedNodes.includes(req)) {
      return { ok: false, reason: `Requiere: ${SKILL_NODES[req]?.name ?? req}` };
    }
  }
  return { ok: true };
}

export function emptyBranchInvestment(): BranchInvestment {
  return { vitalidad: 0, fuerza: 0, sabiduria: 0, tecnica: 0 };
}

/**
 * Evalúa la crisis de mediana edad.
 * - Ramas con <BRANCH_MIN_INVESTMENT → se secan solas.
 * - Ramas con >=BRANCH_MIN_INVESTMENT → elegibles para secado manual.
 */
export function evaluateMidlifeCrisis(investment: BranchInvestment): {
  autoDried: SkillBranch[];
  selectable: SkillBranch[];
  safeguardBranch: SkillBranch | null;
} {
  const autoDried: SkillBranch[] = [];
  const selectable: SkillBranch[] = [];

  let maxInvested: SkillBranch | null = null;
  let maxValue = -1;

  for (const branch of ALL_BRANCHES) {
    const v = investment[branch] ?? 0;
    if (v > maxValue) {
      maxValue = v;
      maxInvested = branch;
    }
    if (v < BRANCH_MIN_INVESTMENT) {
      autoDried.push(branch);
    } else {
      selectable.push(branch);
    }
  }

  // Si TODAS están bajo el umbral, salvamos la más invertida.
  const safeguardBranch =
    selectable.length === 0 && maxInvested !== null ? maxInvested : null;

  return { autoDried, selectable, safeguardBranch };
}