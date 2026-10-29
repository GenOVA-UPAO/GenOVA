import i18n, { type TFunction } from "i18next";

import { ELABORATE_PREVIEWS } from "./previews/elaborate";
import { ENGAGE_PREVIEWS } from "./previews/engage";
import { EVALUATE_PREVIEWS } from "./previews/evaluate";
import { EXPLAIN_PREVIEWS } from "./previews/explain";
import { EXPLORE_PREVIEWS } from "./previews/explore";
import type { ResourcePreviewInfo } from "./previews/preview-types";

const PREVIEWS_BY_PHASE: Record<string, Record<string, ResourcePreviewInfo>> = {
  engage: ENGAGE_PREVIEWS,
  explore: EXPLORE_PREVIEWS,
  explain: EXPLAIN_PREVIEWS,
  elaborate: ELABORATE_PREVIEWS,
  evaluate: EVALUATE_PREVIEWS,
};

export function getResourcePreview(
  phaseKey: string,
  resourceId: string | number,
  t?: TFunction,
): ResourcePreviewInfo | null {
  if (!Object.hasOwn(PREVIEWS_BY_PHASE, phaseKey)) return null;
  const resources = PREVIEWS_BY_PHASE[phaseKey];
  if (!Object.hasOwn(resources, String(resourceId))) return null;
  const preview = resources[String(resourceId)];
  return t ? preview.localized(t) : preview;
}

/** Nombres de todos los tipos de recurso del catálogo (tal como los envía el backend). */
export function catalogResourceNames(): Set<string> {
  return new Set(Object.values(PREVIEWS_BY_PHASE).flatMap((previews) => Object.values(previews).map((info) => info.canonicalLabel)));
}

/** Traduce únicamente nombres del catálogo; los títulos del contenido se conservan. */
export function localizedCatalogName(name: string, t: TFunction = i18n.t): string | null {
  for (const previews of Object.values(PREVIEWS_BY_PHASE)) {
    const match = Object.values(previews).find((info) => info.canonicalLabel === name || info.label === name);
    if (match) return t(match.labelKey);
  }
  return null;
}
