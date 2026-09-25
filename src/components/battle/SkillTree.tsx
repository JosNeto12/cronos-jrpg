import { useBattleStore } from "../../store/battleStore";
import { SKILL_NODES, canBuyNode } from "../../core/progression";
import type { SkillBranch, SkillNode } from "../../core/types/schemas";

const BRANCH_LABEL: Record<SkillBranch, string> = {
  vitalidad: "Vitalidad",
  fuerza: "Fuerza",
  sabiduria: "Sabiduría",
  tecnica: "Técnica",
};

const BRANCH_COLOR: Record<SkillBranch, string> = {
  vitalidad: "border-green-500 text-green-400",
  fuerza: "border-orange-500 text-orange-400",
  sabiduria: "border-blue-500 text-blue-400",
  tecnica: "border-purple-500 text-purple-400",
};

const BRANCHES: SkillBranch[] = [
  "vitalidad",
  "fuerza",
  "sabiduria",
  "tecnica",
];

export function SkillTree() {
  const {
    showSkillTree,
    toggleSkillTree,
    progress,
    buyNode,
    resetProgress,
  } = useBattleStore();

  if (!showSkillTree) return null;

  const nodesByBranch: Record<SkillBranch, SkillNode[]> = {
    vitalidad: [],
    fuerza: [],
    sabiduria: [],
    tecnica: [],
  };
  Object.values(SKILL_NODES).forEach((node) => {
    nodesByBranch[node.branch].push(node);
  });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2">
      <div className="bg-panel rounded-xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold text-accent">Árbol de Vida</h2>
            <div className="text-xs text-slate-400 mt-1 flex gap-3 flex-wrap">
              <span>
                Vivencias: {progress.vivencias}/100
              </span>
              <span className="text-accent font-bold">
                Semillas: {progress.seedsAvailable}
              </span>
              <span>
                Edad: {progress.age} · Victorias: {progress.winsAtCurrentAge}/3
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirm("¿Reiniciar TODO el progreso?")) resetProgress();
              }}
              className="text-xs text-slate-400 hover:text-red-400 px-3 py-2"
            >
              Reiniciar
            </button>
            <button
              onClick={toggleSkillTree}
              className="text-slate-400 hover:text-white px-3 py-1 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {BRANCHES.map((branch) => (
              <div key={branch} className="space-y-2">
                <h3
                  className={`text-sm font-bold border-b pb-1 ${BRANCH_COLOR[branch]}`}
                >
                  {BRANCH_LABEL[branch]}
                </h3>
                {nodesByBranch[branch].map((node) => {
                  const unlocked = progress.unlockedNodes.includes(node.id);
                  const check = canBuyNode(
                    node.id,
                    progress.unlockedNodes,
                    progress.seedsAvailable
                  );
                  const canBuy = check.ok;

                  return (
                    <div
                      key={node.id}
                      className={`p-3 rounded-lg border text-xs ${
                        unlocked
                          ? "border-accent bg-accent/10"
                          : canBuy
                          ? "border-slate-600 bg-bg"
                          : "border-slate-800 bg-bg opacity-60"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold">{node.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {node.cost} Semilla
                        </span>
                      </div>
                      <div className="text-slate-400 mb-2">
                        {node.description}
                      </div>
                      {unlocked ? (
                        <div className="text-accent text-[10px] font-bold">
                          ✓ Desbloqueado
                        </div>
                      ) : (
                        <button
                          onClick={() => buyNode(node.id)}
                          disabled={!canBuy}
                          className="w-full px-2 py-1 bg-accent text-bg font-bold rounded text-[11px] disabled:opacity-40"
                          title={check.reason ?? ""}
                        >
                          {canBuy
                            ? `Comprar (${node.cost})`
                            : check.reason ?? "Bloqueado"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}