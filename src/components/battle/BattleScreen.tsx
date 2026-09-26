import { useEffect } from "react";
import { useBattleStore } from "../../store/battleStore";
import { EntityCard } from "./EntityCard";
import { ActionMenu } from "./ActionMenu";
import { MoveManager } from "./MoveManager";
import { SkillTree } from "./SkillTree";
import { MidlifeCrisis } from "./MidlifeCrisis";
import { vivenciasForNextYear } from "../../core/progression";

export function BattleScreen() {
  const { hero, enemy, phase, log, init, progress, resetProgress } =
    useBattleStore();

  useEffect(() => {
    init();
  }, []);

  const handleHardReset = () => {
    if (
      !confirm(
        "¿Borrar TODO el progreso? Se perderán Vivencias, Semillas, nodos y movimientos."
      )
    ) {
      return;
    }
    try {
      localStorage.removeItem("cronos.progress");
      localStorage.removeItem("cronos.moveOrder");
    } catch {}
    resetProgress();
    setTimeout(() => window.location.reload(), 100);
  };

  const needed = vivenciasForNextYear(progress.age);
  const pct = Math.min(100, (progress.vivencias / needed) * 100);

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-accent">
          Proyecto Cronos — Combate
        </h1>
        <div className="flex gap-4 text-xs flex-wrap items-center">
          <span className="text-slate-400">
            Edad: <span className="text-white">{hero.age}</span>
          </span>
          <span className="text-slate-400">
            Semillas:{" "}
            <span className="text-accent font-bold">
              {progress.seedsAvailable}
            </span>
          </span>
          <button
            onClick={handleHardReset}
            className="px-3 py-1 bg-panel border border-red-700 text-red-400 rounded text-[11px] hover:bg-red-950"
          >
            Reiniciar Todo
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="text-xs text-slate-400 mb-1 flex justify-between">
          <span>Progreso hacia los {hero.age + 1} años</span>
          <span>
            {progress.vivencias} / {needed} Vivencias
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded">
          <div
            className="h-2 bg-accent rounded transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex gap-4 justify-between mb-6 flex-wrap">
        <EntityCard entity={hero} highlight={phase === "hero_turn"} />
        <EntityCard entity={enemy} />
      </div>

      <div className="bg-panel rounded-xl p-4 h-40 overflow-y-auto mb-4 text-sm font-mono">
        {log.map((line, i) => (
          <div key={i} className="text-slate-300">
            › {line}
          </div>
        ))}
      </div>

      <ActionMenu />

      {(phase === "victory" || phase === "defeat") && (
        <div className="mt-6 text-center">
          <p className="text-xl font-bold mb-3">
            {phase === "victory" ? "¡Victoria!" : "Derrota..."}
          </p>
          <button
            onClick={init}
            className="px-5 py-3 bg-accent text-bg font-bold rounded-lg"
          >
            Reiniciar Combate
          </button>
        </div>
      )}

      <MoveManager />
      <SkillTree />
      <MidlifeCrisis />
    </div>
  );
}