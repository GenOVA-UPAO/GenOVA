/**
 * Operaciones puras inmutables sobre arrays de fallback.
 * Sin dependencias de React ni de dominio — testeable en aislamiento.
 *
 * Compartido por:
 *   - core/lib/llm/llmConfigDraft.ts   (panel admin de modelos)
 *   - core/lib/llm/llmSettingsMutations.ts  (settings de usuario por tarea)
 */

/** Intercambia el elemento `i` con el adyacente en dirección `dir` (-1 arriba, +1 abajo).
 *  No-op si el resultado queda fuera de rango. */
export function moveIn<T>(arr: readonly T[], i: number, dir: number): T[] {
  const j = i + dir
  if (j < 0 || j >= arr.length) return [...arr]
  const next = [...arr]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

/** Añade un elemento vacío al final usando la factory proporcionada. */
export function addEmpty<T>(arr: readonly T[], factory: () => T): T[] {
  return [...arr, factory()]
}

/** Filtra fuera el elemento en posición `i`. */
export function removeAt<T>(arr: readonly T[], i: number): T[] {
  return arr.filter((_, j) => j !== i)
}

/** Reemplaza el elemento en posición `i` con `patch` (merge superficial). */
export function setAt<T extends object>(
  arr: readonly T[],
  i: number,
  patch: Partial<T>,
): T[] {
  return arr.map((el, j) => (j === i ? { ...el, ...patch } : el))
}
