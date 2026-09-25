import type { Combatant } from "../types/schemas";

export type TurnEntry = {
  actorId: string;
  readyAt: number;
};

export class TurnManager {
  private clock = 0;
  private queue: TurnEntry[] = [];
  private actors: Combatant[] = [];

  constructor(actors: Combatant[]) {
    this.actors = actors;
    actors.forEach((a) => this.queue.push(this.schedule(a)));
    this.sort();
  }

  private schedule(actor: Combatant): TurnEntry {
    const cost = 1000 / actor.stats.spd;
    return { actorId: actor.id, readyAt: this.clock + cost };
  }

  private sort() {
    this.queue.sort((a, b) => a.readyAt - b.readyAt);
  }

  next(): Combatant {
    const entry = this.queue.shift()!;
    this.clock = entry.readyAt;
    const actor = this.actors.find((a) => a.id === entry.actorId)!;
    this.queue.push(this.schedule(actor));
    this.sort();
    return actor;
  }

  delay(actorId: string, amount = 500) {
    const idx = this.queue.findIndex((e) => e.actorId === actorId);
    if (idx >= 0) {
      this.queue[idx].readyAt += amount;
      this.sort();
    }
  }

  preview(n = 6): TurnEntry[] {
    return this.queue.slice(0, n);
  }
}