import type { StatBlock } from "../types/schemas";

// Puntos de control: multiplicadores por stat según edad.
// El valor en age=30 es 1.0 (base del JSON).
type CurvePoint = { age: number; mult: number };

const CURVES: Record<keyof StatBlock, CurvePoint[]> = {
  hp: [
    { age: 10, mult: 0.60 },
    { age: 20, mult: 0.85 },
    { age: 30, mult: 1.00 },
    { age: 40, mult: 0.98 },
    { age: 50, mult: 0.90 },
    { age: 60, mult: 0.80 },
    { age: 70, mult: 0.70 },
    { age: 80, mult: 0.60 },
    { age: 90, mult: 0.50 },
  ],
  tp: [
    { age: 10, mult: 1.00 },
    { age: 30, mult: 1.00 },
    { age: 60, mult: 1.00 },
    { age: 90, mult: 1.00 },
  ],
  atk: [
    { age: 10, mult: 0.50 },
    { age: 20, mult: 0.85 },
    { age: 30, mult: 1.00 },
    { age: 40, mult: 0.95 },
    { age: 50, mult: 0.80 },
    { age: 60, mult: 0.65 },
    { age: 70, mult: 0.50 },
    { age: 80, mult: 0.38 },
    { age: 90, mult: 0.30 },
  ],
  def: [
    { age: 10, mult: 0.60 },
    { age: 20, mult: 0.85 },
    { age: 30, mult: 1.00 },
    { age: 40, mult: 0.95 },
    { age: 50, mult: 0.85 },
    { age: 60, mult: 0.75 },
    { age: 70, mult: 0.65 },
    { age: 80, mult: 0.55 },
    { age: 90, mult: 0.45 },
  ],
  mag: [
    { age: 10, mult: 0.40 },
    { age: 20, mult: 0.60 },
    { age: 30, mult: 0.85 },
    { age: 40, mult: 1.00 },
    { age: 50, mult: 1.15 },
    { age: 60, mult: 1.30 },
    { age: 70, mult: 1.45 },
    { age: 80, mult: 1.55 },
    { age: 90, mult: 1.60 },
  ],
  res: [
    { age: 10, mult: 0.50 },
    { age: 20, mult: 0.70 },
    { age: 30, mult: 0.85 },
    { age: 40, mult: 1.00 },
    { age: 50, mult: 1.10 },
    { age: 60, mult: 1.20 },
    { age: 70, mult: 1.30 },
    { age: 80, mult: 1.35 },
    { age: 90, mult: 1.40 },
  ],
  spd: [
    { age: 10, mult: 1.20 },
    { age: 20, mult: 1.15 },
    { age: 30, mult: 1.00 },
    { age: 40, mult: 0.90 },
    { age: 50, mult: 0.80 },
    { age: 60, mult: 0.70 },
    { age: 70, mult: 0.60 },
    { age: 80, mult: 0.50 },
    { age: 90, mult: 0.40 },
  ],
  sab: [
    { age: 10, mult: 0.00 },
    { age: 30, mult: 0.00 },
    { age: 40, mult: 0.20 },
    { age: 50, mult: 0.50 },
    { age: 60, mult: 0.90 },
    { age: 70, mult: 1.30 },
    { age: 80, mult: 1.70 },
    { age: 90, mult: 2.00 },
  ],
};

/** Interpola linealmente el multiplicador para una edad dada. */
function interpolate(points: CurvePoint[], age: number): number {
  if (age <= points[0].age) return points[0].mult;
  if (age >= points[points.length - 1].age)
    return points[points.length - 1].mult;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (age >= a.age && age <= b.age) {
      const t = (age - a.age) / (b.age - a.age);
      return a.mult + (b.mult - a.mult) * t;
    }
  }
  return 1;
}

/** Devuelve los stats de un combatant según su edad, redondeados. */
export function getStatsForAge(base: StatBlock, age: number): StatBlock {
  const result = {} as StatBlock;
  (Object.keys(CURVES) as (keyof StatBlock)[]).forEach((key) => {
    const mult = interpolate(CURVES[key], age);
    result[key] = Math.round(base[key] * mult);
  });
  return result;
}

/**
 * Influencia de la Sabiduría en el daño físico.
 * A mayor edad, más parte del ATK se sustituye por SAB.
 */
export function wisdomInfluence(age: number): number {
  if (age <= 40) return 0;
  if (age >= 90) return 0.75;
  // Interpolación lineal de 40 → 0.0 a 90 → 0.75
  return ((age - 40) / 50) * 0.75;
}