import type { Combatant, Element } from "../types/schemas";
import { wisdomInfluence } from "./lifeCurve";

const round = (n: number) => Math.floor(n);

export function elementMultiplier(
  attackerElement: Element,
  defender: Combatant
): number {
  if (defender.weaknesses.includes(attackerElement)) return 1.5;
  if (defender.resistances.includes(attackerElement)) return 0.5;
  return 1;
}

/**
 * Devuelve el "poder ofensivo" del atacante.
 * Jóvenes: ATK puro. Ancianos: mezcla de ATK y SAB.
 */
export function effectiveAttack(attacker: Combatant): number {
  const w = wisdomInfluence(attacker.age);
  return attacker.stats.atk * (1 - w) + attacker.stats.sab * w;
}

export function physicalDamage(
  attacker: Combatant,
  defender: Combatant,
  power = 1
): number {
  const base = effectiveAttack(attacker) * power;
  const mitigation = 100 / (100 + defender.stats.def);
  const elem = elementMultiplier(attacker.element, defender);
  return Math.max(1, round(base * mitigation * elem));
}

export function magicalDamage(
  attacker: Combatant,
  defender: Combatant,
  power = 1
): number {
  const base = attacker.stats.mag * power;
  const mitigation = 100 / (100 + defender.stats.res);
  const elem = elementMultiplier(attacker.element, defender);
  return Math.max(1, round(base * mitigation * elem));
}

export function healing(attacker: Combatant, power = 1): number {
  return round(attacker.stats.mag * power);
}

export function applyMitigation(rawDamage: number, tpSpent: number): number {
  const reduction = Math.min(tpSpent * 0.15, 0.75);
  return Math.max(1, round(rawDamage * (1 - reduction)));
}