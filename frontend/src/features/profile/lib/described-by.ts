/** Valor de aria-describedby coherente con lo que muestra `FormField`. */
export function describedBy(id: string, error?: string, hint?: string): string | undefined {
  if (error !== undefined) return `${id}-error`;
  return hint !== undefined ? `${id}-hint` : undefined;
}
