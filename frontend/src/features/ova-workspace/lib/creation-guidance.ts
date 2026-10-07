import i18n, { type TFunction } from "i18next";

import { MIN_PROMPT_LENGTH } from "./creation-form";

const MIN_PHASES = 2;

/** Caracteres que faltan para que la descripción sea válida (0 si ya lo es). */
export function missingPromptChars(prompt: string): number {
  return Math.max(0, MIN_PROMPT_LENGTH - prompt.trim().length);
}

function phasesPhrase(phases: number, t: TFunction): string {
  const left = MIN_PHASES - phases;
  return phases === 0 ? t("workspace:en_al_menos_value_fases", { p0: String(MIN_PHASES) }) : t("workspace:en_value_fase_mas", { p0: String(left) });
}

function promptPhrase(prompt: string, t: TFunction): string {
  const missing = missingPromptChars(prompt);
  if (prompt.trim().length === 0) return t("workspace:describe_el_tema");
  return missing === 1
    ? t("workspace:falta_1_caracter_en_la_descripcion")
    : t("workspace:faltan_value_caracteres_en_la_descripcion", { p0: String(missing) });
}

/**
 * Por qué «Generar OVA» está deshabilitado, en una frase para mostrar junto al
 * botón. `null` cuando no falta nada del formulario.
 */
export function generateBlocker(prompt: string, phases: number, t: TFunction = i18n.t): string | null {
  const promptOk = missingPromptChars(prompt) === 0;
  const phasesOk = phases >= MIN_PHASES;
  if (!promptOk && !phasesOk) {
    const first = prompt.trim().length === 0 ? t("workspace:describe_el_tema") : t("workspace:completa_la_descripcion");
    return t("workspace:para_generar_value_y_elige_recursos_value", { p0: first, p1: phasesPhrase(phases, t) });
  }
  if (!promptOk) return t("workspace:para_generar_value", { p0: promptPhrase(prompt, t) });
  if (!phasesOk) return t("workspace:para_generar_elige_recursos_value", { p0: phasesPhrase(phases, t) });
  return null;
}

/** Resumen de la selección: «3 recursos en 2 fases». */
export function selectionSummary(total: number, phases: number, t: TFunction = i18n.t): string {
  if (total === 0) return t("workspace:sin_recursos_elegidos");
  const resources = t("workspace:resources", { count: total });
  const phaseText = t("workspace:phases", { count: phases });
  return t("workspace:value_en_value", { p0: resources, p1: phaseText });
}
