export const STATUS_OPTIONS = [
  { label: "Todos los estados", value: "all" },
  { label: "Borrador", value: "borrador" },
  { label: "Generando", value: "generando" },
  { label: "Listo", value: "listo" },
  { label: "Error", value: "error" },
] as const;

/** Valor del filtro a partir del parámetro `?estado=` (cualquier otro valor → "all"). */
export function statusFromParam(value: string | null): string {
  const match = STATUS_OPTIONS.find((opt) => opt.value === value);
  return match ? match.value : "all";
}

/** Etiqueta visible de un valor del filtro de estado. */
export function statusLabel(value: string): string {
  return STATUS_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}
