/** Valor de aria-describedby coherente con lo que pinta `FieldMessage`. */
export function fieldDescribedBy(id: string, error?: string, hint?: string): string | undefined {
  if (error !== undefined) return `${id}-error`;
  return hint === undefined ? undefined : `${id}-help`;
}
