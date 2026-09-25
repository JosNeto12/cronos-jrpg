import type { Combatant } from "../../core/types/schemas";

export function EntityCard({
  entity,
  highlight,
}: {
  entity: Combatant;
  highlight?: boolean;
}) {
  const hpPct = (entity.currentHp / entity.stats.hp) * 100;
  const tpPct = entity.maxTp > 0 ? (entity.currentTp / entity.maxTp) * 100 : 0;

  return (
    <div
      className={`p-4 rounded-xl bg-panel border ${
        highlight ? "border-accent" : "border-slate-700"
      } min-w-[220px]`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold">{entity.name}</span>
        <span className="text-xs text-slate-400">{entity.side}</span>
      </div>

      <div className="mb-2">
        <div className="text-xs text-slate-400 mb-1">
          HP {entity.currentHp}/{entity.stats.hp}
        </div>
        <div className="h-2 bg-slate-800 rounded">
          <div
            className="h-2 bg-danger rounded"
            style={{ width: `${hpPct}%` }}
          />
        </div>
      </div>

      {entity.maxTp > 0 && (
        <div>
          <div className="text-xs text-slate-400 mb-1">
            TP {entity.currentTp}/{entity.maxTp}
          </div>
          <div className="h-2 bg-slate-800 rounded">
            <div
              className="h-2 bg-tension rounded"
              style={{ width: `${tpPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}