import { t } from "i18next";

import type { ModelFacts } from "./model-facts";

/**
 * Qué significan los precios de una lista de modelos. Las tareas Imagen y Video
 * solo ofrecen generadores, que no cobran por tokens: su nota y sus filtros son
 * otros (sin «Visión» ni «Razonamiento», que no aplican).
 */
export function optionsPricing(options: readonly { facts: ModelFacts }[]): {
  mediaOnly: boolean;
  note: string;
} {
  const kinds = options.map((option) => option.facts.generates);
  if (kinds.length === 0 || kinds.some((kind) => kind === null)) {
    return { mediaOnly: false, note: t("llm-settings:optionsPricing.tokens") };
  }
  const note = kinds.every((kind) => kind === "video")
    ? t("llm-settings:optionsPricing.video")
    : t("llm-settings:optionsPricing.image");
  return { mediaOnly: true, note };
}
