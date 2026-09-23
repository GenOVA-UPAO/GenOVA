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
