export type Element = "none" | "fire" | "ice" | "thunder" | "earth";

export type StatBlock = {
  hp: number;
  tp: number;
  atk: number;
  def: number;
  mag: number;
  res: number;
  spd: number;
  sab: number; // Sabiduría
};

export type Combatant = {
  id: string;
  name: string;
  side: "hero" | "enemy";
  stats: StatBlock;
  baseStats: StatBlock; // stats "a los 30", sin modificar por edad
  age: number;
  currentHp: number;
  currentTp: number;
  maxTp: number;
  element: Element;
  weaknesses: Element[];
  resistances: Element[];
};

export type ActionType = "attack" | "skill" | "item" | "mitigate" | "flee";

export type Action = {
  type: ActionType;
  actorId: string;
  targetId?: string;
  skillPower?: number;
  tpCost?: number;
};