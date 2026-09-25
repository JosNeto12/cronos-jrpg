export type Element = "none" | "fire" | "ice" | "thunder" | "earth";

export type MoveType = "physical" | "magical" | "support" | "debuff";

export type StatBlock = {
  hp: number;
  pcr: number;
  atp: number;
  atk: number;
  def: number;
  mag: number;
  res: number;
  spd: number;
  sab: number;
};

export type Combatant = {
  id: string;
  name: string;
  side: "hero" | "enemy";
  stats: StatBlock;
  baseStats: StatBlock;
  age: number;
  currentHp: number;
  currentPcr: number;
  currentAtp: number;
  currentTp: number;
  maxTp: number;
  element: Element;
  weaknesses: Element[];
  resistances: Element[];
};

export type Move = {
  id: string;
  name: string;
  type: MoveType;
  element: Element;
  pcrCost: number;
  atpCost: number;
  tpCost: number;
  tpGain: number;
  power: number;
  description: string;
};

export type ActionType = "attack" | "skill" | "item" | "mitigate" | "flee";

export type Action = {
  type: ActionType;
  actorId: string;
  targetId?: string;
  skillPower?: number;
  tpCost?: number;
};