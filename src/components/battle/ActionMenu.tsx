import { useBattleStore } from "../../store/battleStore";

export function ActionMenu() {
  const {
    phase,
    hero,
    heroAttack,
    heroSkill,
    heroMitigate,
    skipMitigation,
    ageUp,
  } = useBattleStore();

  if (phase === "hero_turn") {
    return (
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={heroAttack}
          className="px-5 py-3 bg-accent text-bg font-bold rounded-lg"
        >
          Atacar (+2 TP)
        </button>
        <button
          onClick={heroSkill}
          disabled={hero.currentTp < 3}
          className="px-5 py-3 bg-tension text-bg font-bold rounded-lg disabled:opacity-40"
        >
          Corte Táctico (-3 TP)
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