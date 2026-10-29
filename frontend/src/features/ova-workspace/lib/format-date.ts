import { formatDateTime } from "@/core/i18n/format";

/** Fecha corta legible («23 sept 2026, 10:42»); vacío si no hay fecha válida. */
export function formatShortDate(value: string | undefined): string {
  if (!value) return "";
  return formatDateTime(value);
}
