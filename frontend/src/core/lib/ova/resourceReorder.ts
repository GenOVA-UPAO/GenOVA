// Lógica pura de reordenamiento de recursos (HU-033). Sin React/red.

/** Mueve el item de fromIdx a toIdx (devuelve nueva lista; no-op si iguales). */
export function applyReorder<T>(items: T[], fromIdx: number, toIdx: number): T[] {
  if (fromIdx === toIdx) return items
  const updated = [...items]
  const [moved] = updated.splice(fromIdx, 1)
  updated.splice(toIdx, 0, moved)
  return updated
}

/** Regla del backend: solo se reordena dentro de la misma fase. */
export function allSamePhaseType(phaseTypes: string[]): boolean {
  return new Set(phaseTypes).size <= 1
}
