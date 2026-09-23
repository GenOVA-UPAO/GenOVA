const FORMATTER = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" });

/** Fecha corta legible («23 sept 2026, 10:42»); vacío si no hay fecha válida. */
export function formatShortDate(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : FORMATTER.format(date);
}
