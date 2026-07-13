import { ELABORATE_PREVIEWS } from "./previews/elaborate";
import { ENGAGE_PREVIEWS } from "./previews/engage";
import { EVALUATE_PREVIEWS } from "./previews/evaluate";
import { EXPLAIN_PREVIEWS } from "./previews/explain";
import { EXPLORE_PREVIEWS } from "./previews/explore";
import type { ResourcePreviewInfo } from "./previews/preview-types";

export type { ResourcePreviewInfo, WireframeKind } from "./previews/preview-types";

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
): ResourcePreviewInfo | null {
  return PREVIEWS_BY_PHASE[phaseKey]?.[String(resourceId)] ?? null;
}
