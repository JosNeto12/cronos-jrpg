import { useEffect } from "react";
import { useBattleStore } from "../../store/battleStore";
import { EntityCard } from "./EntityCard";
import { ActionMenu } from "./ActionMenu";

export function BattleScreen() {
  const { hero, enemy, phase, log, init } = useBattleStore();

  useEffect(() => {
    init();
  }, []);

  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-accent">
        Proyecto Cronos — Combate
      </h1>

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
            Reiniciar
          </button>
        </div>
      )}
    </div>
  );
}