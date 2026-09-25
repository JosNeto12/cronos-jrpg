import type { StatBlock } from "../types/schemas";

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
  pcr: [
    { age: 10, mult: 0.80 },
    { age: 20, mult: 1.00 },
    { age: 30, mult: 0.95 },
    { age: 40, mult: 0.80 },
    { age: 50, mult: 0.65 },
    { age: 60, mult: 0.50 },
    { age: 70, mult: 0.35 },
    { age: 80, mult: 0.25 },
    { age: 90, mult: 0.15 },
  ],
  atp: [
    { age: 10, mult: 0.30 },
    { age: 20, mult: 0.40 },
    { age: 30, mult: 0.55 },
    { age: 40, mult: 0.75 },
    { age: 50, mult: 0.95 },
    { age: 60, mult: 1.15 },
    { age: 70, mult: 1.35 },
    { age: 80, mult: 1.50 },
    { age: 90, mult: 1.60 },
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

export function getStatsForAge(base: StatBlock, age: number): StatBlock {
  const result = {} as StatBlock;
  (Object.keys(CURVES) as (keyof StatBlock)[]).forEach((key) => {
    const mult = interpolate(CURVES[key], age);
    result[key] = Math.round(base[key] * mult);
  });
  return result;
}

export function wisdomInfluence(age: number): number {
  if (age <= 40) return 0;
  if (age >= 90) return 0.75;
  return ((age - 40) / 50) * 0.75;
}

/** Regeneración de PCr por turno (15% del máximo, mínimo 1). */
export function pcrRegen(maxPcr: number): number {
  return Math.max(1, Math.floor(maxPcr * 0.15));
}

/** Regeneración de ATP por turno (10% del máximo, mínimo 1). */
export function atpRegen(maxAtp: number): number {
  return Math.max(1, Math.floor(maxAtp * 0.10));
}

/** Daño por Colapso: 5% del HP máximo, mínimo 1. */
export function collapseDamage(maxHp: number): number {
  return Math.max(1, Math.floor(maxHp * 0.05));
}