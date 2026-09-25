import { useBattleStore } from "../../store/battleStore";

const ATTACK_PCR_COST = 2;
const SKILL_PCR_COST = 4;
const SKILL_TP_COST = 3;

export function ActionMenu() {
  const {
    phase,
    hero,
    heroAttack,
    heroSkill,
    heroRest,
    heroMitigate,
    skipMitigation,
    ageUp,
  } = useBattleStore();

  if (phase === "hero_turn") {
    const canAttack = hero.currentPcr >= ATTACK_PCR_COST;
    const canSkill =
      hero.currentPcr >= SKILL_PCR_COST && hero.currentTp >= SKILL_TP_COST;

    return (
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={heroAttack}
          disabled={!canAttack}
          className="px-5 py-3 bg-accent text-bg font-bold rounded-lg disabled:opacity-40"
          title={!canAttack ? "PCr insuficiente" : ""}
        >
          Atacar ({ATTACK_PCR_COST} PCr)
        </button>
        <button
          onClick={heroSkill}
          disabled={!canSkill}
          className="px-5 py-3 bg-tension text-bg font-bold rounded-lg disabled:opacity-40"
          title={!canSkill ? "PCr o TP insuficientes" : ""}
        >
          Corte Táctico ({SKILL_PCR_COST} PCr + {SKILL_TP_COST} TP)
        </button>
        <button
          onClick={heroRest}
          className="px-5 py-3 bg-slate-600 text-white font-bold rounded-lg"
          title="Recupera PCr y ATP, pero pierdes 1 TP"
        >
          Tomar Aliento
        </button>
        <button
          onClick={ageUp}
          disabled={hero.age >= 90}
          className="px-5 py-3 bg-panel border border-accent text-accent font-bold rounded-lg disabled:opacity-40"
        >
          Cumplir 1 Año ({hero.age} → {hero.age + 1})
        </button>
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