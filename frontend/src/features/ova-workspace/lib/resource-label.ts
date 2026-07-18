import { humanizeResourceType } from "./ova-job-view-model";
import { phaseMeta } from "./phase-meta";
import type { Phase } from "./types";

/** Nombre legible del recurso para docentes (no jerga 5E en inglés). */
export function resourceLabel(phase: Phase): string {
  const title = String(phase["title"] ?? "").trim();
  if (title) return title;
  const type = humanizeResourceType(phase["resource_type"] as string | number | undefined);
  if (type) return type;
  return phaseMeta(String(phase["phase_type"] ?? "")).label || "Recurso";
}

const EMPTY_PREVIEW = "Sin contenido todavía.";
const NO_TEXT_PREVIEW = "Contenido HTML del recurso (sin texto visible).";

/** Texto plano completo extraído del HTML del recurso. */
export function contentPlainText(html: string | undefined | null): string {
  const raw = String(html ?? "").trim();
  if (!raw) return EMPTY_PREVIEW;
  const text = raw
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
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
