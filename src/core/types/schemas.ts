export type Element = "none" | "fire" | "ice" | "thunder" | "earth";

export type StatBlock = {
  hp: number;
  pcr: number; // Fosfocreatina máxima
  atp: number; // Adenosín Trifosfato máximo
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

export type ActionType = "attack" | "skill" | "item" | "mitigate" | "flee";

export type Action = {
  type: ActionType;
  actorId: string;
  targetId?: string;
  skillPower?: number;
  tpCost?: number;
};