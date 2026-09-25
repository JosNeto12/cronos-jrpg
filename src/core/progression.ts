import type { SkillNode, StatBlock } from "./types/schemas";
import skillTreeData from "../data/skillTree.json";

export const VIVENCIAS_PER_SEED = 100;
export const FIGHTS_PER_YEAR = 3;
export const MAX_AGE = 90;

export const SKILL_NODES: Record<string, SkillNode> = skillTreeData as Record<
  string,
  SkillNode
>;

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
  seedsAvailable: number
): { ok: boolean; reason?: string } {
  const node = SKILL_NODES[nodeId];
  if (!node) return { ok: false, reason: "Nodo desconocido" };
  if (unlockedNodes.includes(nodeId)) {
    return { ok: false, reason: "Ya desbloqueado" };
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

export function addVivencias(
  currentVivencias: number,
  currentSeeds: number,
  gained: number
): { vivencias: number; seedsAvailable: number; seedsGained: number } {
  const total = currentVivencias + gained;
  const seedsGained = Math.floor(total / VIVENCIAS_PER_SEED);
  return {
    vivencias: total % VIVENCIAS_PER_SEED,
    seedsAvailable: currentSeeds + seedsGained,
    seedsGained,
  };
}