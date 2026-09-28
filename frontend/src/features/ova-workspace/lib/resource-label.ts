import { humanizeResourceType } from "./ova-job-view-model";
import { phaseMeta } from "./phase-meta";
import { resourceDisplayName } from "./resource-display-name";
import type { Phase } from "./types";

/** Devuelve el valor solo si es texto; evita stringificar objetos a "[object Object]". */
function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Nombre legible del recurso para docentes (no jerga 5E en inglés). */
export function resourceLabel(phase: Phase): string {
  const title = asText(phase.title).trim();
  if (title) return resourceDisplayName(title);
  const type = humanizeResourceType(phase.resource_type as string | number | undefined);
  if (type) return type;
  return phaseMeta(asText(phase.phase_type)).label || "Recurso";
}

const EMPTY_PREVIEW = "Sin contenido todavía.";
const NO_TEXT_PREVIEW = "Contenido HTML del recurso (sin texto visible).";

function removeElementContent(html: string, tag: string): string {
  let result = html;
  let start = result.toLowerCase().indexOf(`<${tag}`);
  while (start >= 0) {
    const openingEnd = result.indexOf(">", start);
    const closingStart = result.toLowerCase().indexOf(`</${tag}`, openingEnd + 1);
    const closingEnd = closingStart < 0 ? -1 : result.indexOf(">", closingStart);
    if (openingEnd < 0 || closingStart < 0 || closingEnd < 0) break;
    result = `${result.slice(0, start)} ${result.slice(closingEnd + 1)}`;
    start = result.toLowerCase().indexOf(`<${tag}`);
  }
  return result;
}

function stripHtmlTags(html: string): string {
  let result = "";
  let position = 0;
  while (position < html.length) {
    const tagStart = html.indexOf("<", position);
    if (tagStart < 0) return result + html.slice(position);
    const tagEnd = html.indexOf(">", tagStart + 1);
    if (tagEnd < 0) return result + html.slice(position);
    result += `${html.slice(position, tagStart)} `;
    position = tagEnd + 1;
  }
  return result;
}

/** Texto plano completo extraído del HTML del recurso. */
export function contentPlainText(html: string | undefined | null): string {
  const raw = (html ?? "").trim();
  if (!raw) return EMPTY_PREVIEW;
  const text = stripHtmlTags(removeElementContent(removeElementContent(raw, "style"), "script"))
    .replace(/\s+/g, " ")
    .trim();
  return text || NO_TEXT_PREVIEW;
}

/** Vista previa truncada de texto plano a partir del HTML del recurso. */
export function contentPlainPreview(html: string | undefined | null, max = 140): string {
  const text = contentPlainText(html);
  if (text === EMPTY_PREVIEW || text === NO_TEXT_PREVIEW) return text;
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export function isContentPreviewTruncated(html: string | undefined | null, max = 140): boolean {
  const text = contentPlainText(html);
  if (text === EMPTY_PREVIEW || text === NO_TEXT_PREVIEW) return false;
  return text.length > max;
}
