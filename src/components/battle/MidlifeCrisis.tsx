import { useState } from "react";
import { useBattleStore } from "../../store/battleStore";
import {
  evaluateMidlifeCrisis,
  MIDLIFE_CRISIS_AGE,
  BRANCH_MIN_INVESTMENT,
} from "../../core/progression";
import type { SkillBranch } from "../../core/types/schemas";

const BRANCH_LABEL: Record<SkillBranch, string> = {
  vitalidad: "Vitalidad",
  fuerza: "Fuerza",
  sabiduria: "Sabiduría",
  tecnica: "Técnica",
};

export function MidlifeCrisis() {
  const { progress, resolveMidlifeCrisis } = useBattleStore();
  const [selected, setSelected] = useState<SkillBranch | null>(null);

  const shouldShow =
    progress.age >= MIDLIFE_CRISIS_AGE && !progress.midlifeCrisisResolved;

  if (!shouldShow) return null;

  const { autoDried, selectable, safeguardBranch } = evaluateMidlifeCrisis(
    progress.branchInvestment
  );

  const needsChoice = !safeguardBranch && selectable.length > 1;

  const handleConfirm = () => {
    if (safeguardBranch) {
      resolveMidlifeCrisis(null);
      return;
    }
    if (selectable.length === 1) {
      resolveMidlifeCrisis(null); // la única viva se queda, no hay elección
      return;
    }
    if (!selected) return;
    resolveMidlifeCrisis(selected);
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60] p-4">
      <div className="bg-panel rounded-xl max-w-2xl w-full border-2 border-amber-700 overflow-hidden">
        <div className="p-6 border-b border-amber-900/50">
          <h2 className="text-2xl font-bold text-amber-500 mb-2">
            La mitad de tu vida ha pasado
          </h2>
          <p className="text-sm text-slate-300">
            Cronos cumple {MIDLIFE_CRISIS_AGE} años. Las ramas que descuidó
            comienzan a marchitarse. Todo lo que no creció, se secará.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xs uppercase text-slate-400 mb-2">
              Ramas que se secarán solas
            </h3>
            {autoDried.length === 0 ? (
              <p className="text-sm text-slate-500 italic">
                Ninguna. Has cuidado todas las ramas activas.
              </p>
            ) : (
              <ul className="space-y-1">
                {autoDried.map((b) => (
                  <li
                    key={b}
                    className="text-sm text-amber-700 line-through flex justify-between"
                  >
                    <span>{BRANCH_LABEL[b]}</span>
                    <span className="text-xs">
                      {progress.branchInvestment[b] ?? 0} / {BRANCH_MIN_INVESTMENT}{" "}
                      Semillas
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {safeguardBranch && (
            <div className="p-3 bg-slate-800/50 rounded border border-slate-700">
              <p className="text-sm text-slate-300">
                No cuidaste ninguna rama lo suficiente. La más fuerte
                sobrevive: <strong className="text-accent">
                  {BRANCH_LABEL[safeguardBranch]}
                </strong>.
              </p>
            </div>
          )}

          {needsChoice && (
            <div>
              <h3 className="text-xs uppercase text-slate-400 mb-2">
                Elige qué rama sacrificar
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Solo puedes salvar {selectable.length - 1} de las{" "}
                {selectable.length} ramas cuidadas. Elige sabiamente: la
                decisión es para siempre.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {selectable.map((b) => {
                  const isSelected = selected === b;
                  return (
                    <button
                      key={b}
                      onClick={() => setSelected(b)}
                      className={`p-3 rounded border-2 text-left transition ${
                        isSelected
                          ? "border-red-600 bg-red-950/40"
                          : "border-slate-700 bg-bg hover:border-slate-500"
                      }`}
                    >
                      <div className="font-bold">{BRANCH_LABEL[b]}</div>
                      <div className="text-xs text-slate-400">
                        {progress.branchInvestment[b]} Semillas invertidas
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={handleConfirm}
            disabled={needsChoice && !selected}
            className="px-5 py-3 bg-amber-600 text-bg font-bold rounded-lg disabled:opacity-40"
          >
            Aceptar el paso del tiempo
          </button>
        </div>
      </div>
    </div>
  );
}