import { MIN_PROMPT_LENGTH } from "./creation-form";

const MIN_PHASES = 2;

/** Caracteres que faltan para que la descripción sea válida (0 si ya lo es). */
export function missingPromptChars(prompt: string): number {
  return Math.max(0, MIN_PROMPT_LENGTH - prompt.trim().length);
}

function phasesPhrase(phases: number): string {
  const left = MIN_PHASES - phases;
  return phases === 0 ? `en al menos ${String(MIN_PHASES)} fases` : `en ${String(left)} fase más`;
}

function promptPhrase(prompt: string): string {
  const missing = missingPromptChars(prompt);
  if (prompt.trim().length === 0) return "describe el tema";
  return `faltan ${String(missing)} caracteres en la descripción`;
}

/**
 * Por qué «Generar OVA» está deshabilitado, en una frase para mostrar junto al
 * botón. `null` cuando no falta nada del formulario.
 */
export function generateBlocker(prompt: string, phases: number): string | null {
  const promptOk = missingPromptChars(prompt) === 0;
  const phasesOk = phases >= MIN_PHASES;
  if (!promptOk && !phasesOk) {
    const first = prompt.trim().length === 0 ? "describe el tema" : "completa la descripción";
    return `Para generar, ${first} y elige recursos ${phasesPhrase(phases)}.`;
  }
  if (!promptOk) return `Para generar, ${promptPhrase(prompt)}.`;
  if (!phasesOk) return `Para generar, elige recursos ${phasesPhrase(phases)}.`;
  return null;
}

/** Resumen de la selección: «3 recursos en 2 fases». */
export function selectionSummary(total: number, phases: number): string {
  if (total === 0) return "Sin recursos elegidos";
  const resources = total === 1 ? "1 recurso" : `${String(total)} recursos`;
  const phaseText = phases === 1 ? "1 fase" : `${String(phases)} fases`;
  return `${resources} en ${phaseText}`;
}
