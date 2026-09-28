/**
 * Primer texto con contenido (ignora `null`, `undefined` y cadenas en blanco).
 * Sustituye a `a || b || "fallback"` cuando `""` también debe tratarse como vacío.
 */
export function firstNonBlank(
  ...values: readonly (string | null | undefined)[]
): string | undefined {
  for (const value of values) {
    if (value !== null && value !== undefined && value.trim() !== "") return value;
  }
  return undefined;
}
