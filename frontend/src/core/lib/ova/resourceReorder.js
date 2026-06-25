// Lógica pura de reordenamiento de recursos (HU-033). Sin React/red.

/** Mueve el item de fromIdx a toIdx (devuelve nueva lista; no-op si iguales). */
export function applyReorder(items, fromIdx, toIdx) {
  if (fromIdx === toIdx) return items
  const updated = [...items]
  const [moved] = updated.splice(fromIdx, 1)
  updated.splice(toIdx, 0, moved)
  return updated
}

/** Regla del backend: solo se reordena dentro de la misma fase. */
export function allSamePhaseType(phaseTypes) {
  return new Set(phaseTypes).size <= 1
}
