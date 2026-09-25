import { useBattleStore } from "../../store/battleStore";
import type { Move } from "../../core/types/schemas";
import movesData from "../../data/moves.json";

const MOVES: Record<string, Move> = movesData as Record<string, Move>;

export function MoveManager() {
  const {
    showMoveManager,
    moveOrder,
    toggleMoveManager,
    reorderMove,
    resetMoveOrder,
  } = useBattleStore();

  if (!showMoveManager) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-panel rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-lg font-bold text-accent">
            Orden de Movimientos
          </h2>
          <button
            onClick={toggleMoveManager}
            className="text-slate-400 hover:text-white px-3 py-1 text-xl"
          >
            ×
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs text-slate-400 mb-3">
            Usa las flechas para reordenar. Los primeros aparecen arriba en el
            combate.
          </p>
          <ul className="space-y-2">
            {moveOrder.map((id, idx) => {
              const move = MOVES[id];
              if (!move) return null;
              const isFirst = idx === 0;
              const isLast = idx === moveOrder.length - 1;
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 bg-bg rounded-lg p-2 border border-slate-700"
                >
                  <span className="text-xs text-slate-500 w-6 text-center">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="font-bold text-sm">{move.name}</div>
                    <div className="text-xs text-slate-400">
                      {move.description}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => reorderMove(id, "up")}
                      disabled={isFirst}
                      className="px-2 py-1 bg-slate-700 rounded text-xs disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => reorderMove(id, "down")}
                      disabled={isLast}
                      className="px-2 py-1 bg-slate-700 rounded text-xs disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="p-4 border-t border-slate-700 flex justify-between gap-2">
          <button
            onClick={resetMoveOrder}
            className="px-4 py-2 bg-panel border border-slate-600 rounded-lg text-sm"
          >
            Restablecer
          </button>
          <button
            onClick={toggleMoveManager}
            className="px-4 py-2 bg-accent text-bg font-bold rounded-lg text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}