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

/** Vista previa de texto plano a partir del HTML del recurso. */
export function contentPlainPreview(html: string | undefined | null, max = 140): string {
  const raw = String(html ?? "").trim();
  if (!raw) return "Sin contenido todavía.";
  const text = raw
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "Contenido HTML del recurso (sin texto visible).";
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
