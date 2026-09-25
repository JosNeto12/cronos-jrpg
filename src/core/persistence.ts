const MOVE_ORDER_KEY = "cronos.moveOrder";

export function loadMoveOrder(): string[] | null {
  try {
    const raw = localStorage.getItem(MOVE_ORDER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveMoveOrder(order: string[]): void {
  try {
    localStorage.setItem(MOVE_ORDER_KEY, JSON.stringify(order));
  } catch {
    // localStorage podría no estar disponible (modo incógnito estricto)
  }
}

export function clearMoveOrder(): void {
  try {
    localStorage.removeItem(MOVE_ORDER_KEY);
  } catch {
    // ignorar
  }
}

/**
 * Reconcilia el orden guardado con la lista actual de movimientos conocidos.
 * - Los movimientos que ya no existen en `known` se eliminan del orden.
 * - Los movimientos nuevos que no están en el orden guardado se añaden al final.
 */
export function reconcileOrder(
  known: string[],
  saved: string[] | null
): string[] {
  if (!saved) return [...known];
  const filtered = saved.filter((id) => known.includes(id));
  for (const id of known) {
    if (!filtered.includes(id)) filtered.push(id);
  }
  return filtered;
}