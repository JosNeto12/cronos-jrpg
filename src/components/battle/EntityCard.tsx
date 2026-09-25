import type { Combatant } from "../../core/types/schemas";

function Bar({
  label,
  current,
  max,
  colorClass,
}: {
  label: string;
  current: number;
  max: number;
  colorClass: string;
}) {
  const pct = max > 0 ? (current / max) * 100 : 0;
  return (
    <div className="mb-2">
      <div className="text-xs text-slate-400 mb-1">
        {label} {current}/{max}
      </div>
      <div className="h-2 bg-slate-800 rounded">
        <div
          className={`h-2 rounded transition-all ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function EntityCard({
  entity,
  highlight,
}: {
  entity: Combatant;
  highlight?: boolean;
}) {
  const fatigued = entity.currentPcr === 0;
  const collapsed = entity.currentAtp === 0;

  return (
    <div
      className={`p-4 rounded-xl bg-panel border ${
        highlight ? "border-accent" : "border-slate-700"
      } min-w-[260px]`}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold">{entity.name}</span>
        <span className="text-xs text-slate-400">
          {entity.side === "hero" ? `${entity.age} años` : entity.side}
        </span>
      </div>

      <Bar
        label="HP"
        current={entity.currentHp}
        max={entity.stats.hp}
        colorClass="bg-danger"
      />
      <Bar
        label="PCr"
        current={entity.currentPcr}
        max={entity.stats.pcr}
        colorClass="bg-pcr"
      />
      <Bar
        label="ATP"
        current={entity.currentAtp}
        max={entity.stats.atp}
        colorClass="bg-atp"
      />
      {entity.maxTp > 0 && (
        <Bar
          label="TP"
          current={entity.currentTp}
          max={entity.maxTp}
          colorClass="bg-tension"
        />
      )}

      {(fatigued || collapsed) && (
        <div className="flex gap-2 mt-2 text-xs">
          {fatigued && (
            <span className="px-2 py-1 bg-pcr/20 text-pcr rounded">
              Fatiga
            </span>
          )}
          {collapsed && (
            <span className="px-2 py-1 bg-atp/20 text-atp rounded">
              Colapso
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-700">
        <span>ATK {entity.stats.atk}</span>
        <span>DEF {entity.stats.def}</span>
        <span>SPD {entity.stats.spd}</span>
        <span>MAG {entity.stats.mag}</span>
        <span>RES {entity.stats.res}</span>
        <span className="text-accent">SAB {entity.stats.sab}</span>
      </div>
    </div>
  );
}