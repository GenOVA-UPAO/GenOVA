import type { OvaListItem } from "./types";

const DATE_FORMAT = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Fecha corta legible ("20 sept 2026"); cadena vacía si no hay fecha válida. */
export function formatShortDate(value: unknown): string {
  if (typeof value !== "string" || value === "") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return DATE_FORMAT.format(date).replaceAll(".", "");
}

function normalize(text: string): string {
  return text
    .replace(/(…|\.\.\.)\s*$/, "")
    .replaceAll(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("es");
}

/**
 * Devuelve la descripción solo si aporta algo al título. Al generar, el backend
 * rellena la descripción con el propio prompt, así que a menudo repite el título
 * (entero o truncado con «…»); en ese caso no se muestra.
 */
export function meaningfulDescription(ova: Pick<OvaListItem, "title" | "description">): string {
  const description = ova.description?.trim() ?? "";
  if (description === "") return "";
  const title = normalize(ova.title ?? "");
  const desc = normalize(description);
  if (title !== "" && (desc.startsWith(title) || title.startsWith(desc))) return "";
  return description;
}

/** Nombre del autor (solo llega para administradores). */
export function ownerNameOf(ova: OvaListItem): string {
  const owner = ova.owner as { full_name?: string } | undefined;
  return owner?.full_name?.trim() ?? "";
}

/** Número de versión si es mayor que 1 (la v1 no aporta información). */
export function visibleVersion(ova: OvaListItem): number | null {
  const version = Number(ova.version_number);
  return Number.isFinite(version) && version > 1 ? version : null;
}

const FULL_DATE_FORMAT = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short" });
const RELATIVE_FORMAT = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** Por debajo de este margen, `updated_at` es el propio fin de la generación, no una edición. */
const EDIT_GAP = 15 * MINUTE;

function toDate(value: unknown): Date | null {
  if (typeof value !== "string" || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/**
 * Fecha relativa para escanear una lista («hace 5 minutos», «ayer», «hace 3
 * días»); a partir de una semana, la fecha corta precedida de «el».
 */
export function relativeDate(date: Date, now: Date = new Date()): string {
  const diff = now.getTime() - date.getTime();
  if (diff < MINUTE) return "hace un momento";
  if (diff < 60 * MINUTE) return RELATIVE_FORMAT.format(-Math.floor(diff / MINUTE), "minute");
  const days = Math.round((startOfDay(now) - startOfDay(date)) / DAY);
  if (days === 0) return RELATIVE_FORMAT.format(-Math.floor(diff / (60 * MINUTE)), "hour");
  if (days < 7) return RELATIVE_FORMAT.format(-days, "day");
  return `el ${formatShortDate(date.toISOString())}`;
}

export interface ActivityDate {
  /** Texto visible: «Editado hace 2 horas», «Creado el 3 ago 2026». */
  label: string;
  /** Fecha ISO para `<time dateTime>`. */
  iso: string;
  /** Fecha completa para el tooltip nativo. */
  full: string;
}

/** Última actividad del OVA: la edición si la hubo después de crearlo; si no, la creación. */
export function lastActivity(
  ova: OvaListItem,
  now: Date = new Date(),
): ActivityDate | null {
  const created = toDate(ova.created_at);
  const updated = toDate(ova.updated_at);
  const edited = Boolean(created && updated && updated.getTime() - created.getTime() > EDIT_GAP);
  const date = edited ? updated : (created ?? updated);
  if (!date) return null;
  return {
    label: `${edited ? "Editado" : "Creado"} ${relativeDate(date, now)}`,
    iso: date.toISOString(),
    full: FULL_DATE_FORMAT.format(date),
  };
}

/** Fecha en la que el OVA pasó a la papelera, en el mismo formato relativo. */
export function trashedAt(ova: OvaListItem, now: Date = new Date()): ActivityDate | null {
  const date = toDate(ova.deleted_at);
  if (!date) return null;
  return {
    label: `Movido a la papelera ${relativeDate(date, now)}`,
    iso: date.toISOString(),
    full: FULL_DATE_FORMAT.format(date),
  };
}
