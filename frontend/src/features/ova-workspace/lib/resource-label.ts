import i18n, { type TFunction } from "i18next";

import { humanizeResourceType } from "./ova-job-view-model";
import { phaseMeta } from "./phase-meta";
import { resourceDisplayName } from "./resource-display-name";
import type { Phase } from "./types";

/** Devuelve el valor solo si es texto; evita stringificar objetos a "[object Object]". */
function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Nombre legible del recurso para docentes (no jerga 5E en inglés). */
export function resourceLabel(phase: Phase, t: TFunction = i18n.t): string {
  const title = asText(phase.title).trim();
  if (title) return resourceDisplayName(title, t);
  const type = humanizeResourceType(phase.resource_type as string | number | undefined);
  if (type) return resourceDisplayName(type, t);
  return phaseMeta(asText(phase.phase_type), t).label || t("workspace:recurso");
}

const emptyPreview = () => i18n.t("workspace:sin_contenido_todavia");
const noTextPreview = () => i18n.t("workspace:contenido_html_del_recurso_sin_texto_visible");

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

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Decodifica entidades HTML (también las doblemente codificadas, «&amp;amp;»). */
export function decodeHtmlEntities(text: string): string {
  let current = text;
  for (let pass = 0; pass < 3; pass++) {
    const next = current.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
      if (code.startsWith("#")) {
        const point = code[1].toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
        return Number.isFinite(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
      }
      return NAMED_ENTITIES[code.toLowerCase()] ?? match;
    });
    if (next === current) break;
    current = next;
  }
  return current;
}

/** Texto plano completo extraído del HTML del recurso. */
export function contentPlainText(html: string | undefined | null): string {
  const raw = (html ?? "").trim();
  if (!raw) return emptyPreview();
  const text = decodeHtmlEntities(stripHtmlTags(removeElementContent(removeElementContent(raw, "style"), "script")))
    .replace(/\s+/g, " ")
    .trim();
  return text || noTextPreview();
}

/** Vista previa truncada de texto plano a partir del HTML del recurso. */
export function contentPlainPreview(html: string | undefined | null, max = 140): string {
  const text = contentPlainText(html);
  if (text === emptyPreview() || text === noTextPreview()) return text;
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export function isContentPreviewTruncated(html: string | undefined | null, max = 140): boolean {
  const text = contentPlainText(html);
  if (text === emptyPreview() || text === noTextPreview()) return false;
  return text.length > max;
}

/**
 * Resumen del recurso sin los títulos con que suele empezar su HTML (el del OVA y
 * el del propio recurso, p. ej. «Mapa conceptual: …»), para que cada extracto
 * muestre contenido y no repita lo que ya dice la cabecera.
 */
export function previewWithoutTitles(html: string | undefined | null, titles: string[], max = 120): string {
  const full = contentPlainText(html);
  if (full === emptyPreview() || full === noTextPreview()) return full;
  let text = full;
  for (const title of titles) {
    const prefix = title.trim().toLowerCase();
    if (!prefix || !text.toLowerCase().startsWith(prefix)) continue;
    const rest = text.slice(prefix.length).replace(/^\s*[:\-–—|·]\s*/, "").trim();
    if (rest) text = rest;
  }
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
