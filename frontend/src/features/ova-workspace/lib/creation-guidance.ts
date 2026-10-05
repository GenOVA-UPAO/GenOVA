import i18n from "i18next";

import { MIN_PROMPT_LENGTH } from "./creation-form";

const MIN_PHASES = 2;

/** Caracteres que faltan para que la descripción sea válida (0 si ya lo es). */
export function missingPromptChars(prompt: string): number {
  return Math.max(0, MIN_PROMPT_LENGTH - prompt.trim().length);
}

function phasesPhrase(phases: number): string {
  const left = MIN_PHASES - phases;
  return phases === 0 ? i18n.t("workspace:en_al_menos_value_fases", { p0: String(MIN_PHASES) }) : i18n.t("workspace:en_value_fase_mas", { p0: String(left) });
}

function promptPhrase(prompt: string): string {
  const missing = missingPromptChars(prompt);
  if (prompt.trim().length === 0) return i18n.t("workspace:describe_el_tema");
  return missing === 1
    ? i18n.t("workspace:falta_1_caracter_en_la_descripcion")
    : i18n.t("workspace:faltan_value_caracteres_en_la_descripcion", { p0: String(missing) });
}

/**
 * Por qué «Generar OVA» está deshabilitado, en una frase para mostrar junto al
 * botón. `null` cuando no falta nada del formulario.
 */
export function generateBlocker(prompt: string, phases: number): string | null {
  const promptOk = missingPromptChars(prompt) === 0;
  const phasesOk = phases >= MIN_PHASES;
  if (!promptOk && !phasesOk) {
    const first = prompt.trim().length === 0 ? i18n.t("workspace:describe_el_tema") : i18n.t("workspace:completa_la_descripcion");
    return i18n.t("workspace:para_generar_value_y_elige_recursos_value", { p0: first, p1: phasesPhrase(phases) });
  }
  if (!promptOk) return i18n.t("workspace:para_generar_value", { p0: promptPhrase(prompt) });
  if (!phasesOk) return i18n.t("workspace:para_generar_elige_recursos_value", { p0: phasesPhrase(phases) });
  return null;
}

/** Resumen de la selección: «3 recursos en 2 fases». */
export function selectionSummary(total: number, phases: number): string {
  if (total === 0) return i18n.t("workspace:sin_recursos_elegidos");
  const resources = i18n.t("workspace:resources", { count: total });
  const phaseText = i18n.t("workspace:phases", { count: phases });
  return i18n.t("workspace:value_en_value", { p0: resources, p1: phaseText });
}
