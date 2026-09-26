import type { PlayerProgress } from "./types/schemas";
import { emptyBranchInvestment } from "./progression";

const MOVE_ORDER_KEY = "cronos.moveOrder";
const PROGRESS_KEY = "cronos.progress";

export function loadMoveOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(MOVE_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveMoveOrder(order: string[]): void {
  try {
    localStorage.setItem(MOVE_ORDER_KEY, JSON.stringify(order));
  } catch {}
}

export function clearMoveOrder(): void {
  try {
    localStorage.removeItem(MOVE_ORDER_KEY);
  } catch {}
}

export function reconcileOrder(
  known: string[],
  saved: string[] | null
): string[] {
  if (!saved) return [...known];
  const filtered = saved.filter((id) => known.includes(id));
  for (const id of known) {
    if (!filtered.includes(id)) filtered.push(id);
  }
  return filtered;
}

export function loadProgress(): PlayerProgress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      Array.isArray(parsed.unlockedNodes) &&
      Array.isArray(parsed.knownMoves) &&
      typeof parsed.age === "number"
    ) {
      // Normalizar campos nuevos por si el guardado es viejo
      return {
        vivencias: parsed.vivencias ?? 0,
        seedsAvailable: parsed.seedsAvailable ?? 0,
        age: parsed.age,
        unlockedNodes: parsed.unlockedNodes,
        knownMoves: parsed.knownMoves,
        branchInvestment: parsed.branchInvestment ?? emptyBranchInvestment(),
        driedBranches: parsed.driedBranches ?? [],
        midlifeCrisisResolved: parsed.midlifeCrisisResolved ?? false,
        warning45Shown: parsed.warning45Shown ?? false,
        warning49Shown: parsed.warning49Shown ?? false,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {}
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {}
}