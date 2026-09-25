import { useBattleStore } from "../../store/battleStore";
import type { Move } from "../../core/types/schemas";
import movesData from "../../data/moves.json";

const MOVES: Record<string, Move> = movesData as Record<string, Move>;

function canUseMove(move: Move, hero: any): boolean {
  if (move.pcrCost > hero.currentPcr) return false;
  if (move.atpCost > hero.currentAtp) return false;
  if (move.tpCost > hero.currentTp) return false;
  return true;
}

function costLabel(move: Move): string {
  const parts: string[] = [];
  if (move.pcrCost > 0) parts.push(`${move.pcrCost} PCr`);
  if (move.atpCost > 0) parts.push(`${move.atpCost} ATP`);
  if (move.tpCost > 0) parts.push(`${move.tpCost} TP`);
  if (parts.length === 0) return "gratis";
  return parts.join(" + ");
}

function moveColor(move: Move): string {
  if (move.type === "physical") return "bg-pcr text-bg";
  if (move.type === "magical") return "bg-atp text-bg";
  if (move.type === "support") return "bg-slate-600 text-white";
  return "bg-slate-700 text-white";
}

export function ActionMenu() {
  const {
    phase,
    hero,
    progress,
    moveOrder,
    executeMove,
    heroMitigate,
    skipMitigation,
    toggleMoveManager,
    toggleSkillTree,
  } = useBattleStore();

  if (phase === "hero_turn") {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {moveOrder.map((id) => {
            const move = MOVES[id];
            if (!move) return null;
            const enabled = canUseMove(move, hero);
            const label = costLabel(move);
            return (
              <button
                key={id}
                onClick={() => executeMove(id)}
                disabled={!enabled}
                className={`px-4 py-3 rounded-lg font-bold text-left disabled:opacity-40 ${moveColor(
                  move
                )}`}
                title={`${move.description} (${label})`}
              >
                <div className="text-sm">{move.name}</div>
                <div className="text-xs opacity-80 mt-1">
                  {label}
                  {move.tpGain > 0 && ` · +${move.tpGain} TP`}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={toggleSkillTree}
            className="px-5 py-3 bg-panel border border-purple-500 text-purple-400 font-bold rounded-lg"
          >
            Árbol de Vida ({progress.seedsAvailable} Semillas)
          </button>
          <button
            onClick={toggleMoveManager}
            className="px-5 py-3 bg-panel border border-slate-600 text-slate-200 font-bold rounded-lg"
          >
            Ordenar
          </button>
        </div>
      </div>
    );
  }

  if (phase === "mitigation_prompt") {
    const max = hero.currentTp;
    return (
      <div className="flex gap-2 flex-wrap items-center">
        <span className="text-sm text-slate-400">Mitigar con TP:</span>
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            disabled={n > max}
            onClick={() => (n === 0 ? skipMitigation() : heroMitigate(n))}
            className="px-3 py-2 bg-panel border border-slate-600 rounded-lg disabled:opacity-30"
          >
            {n} TP
          </button>
        ))}
      </div>
    );
  }

  return null;
}