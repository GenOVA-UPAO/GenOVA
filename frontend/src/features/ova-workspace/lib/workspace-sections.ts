import { PHASE_ORDER } from "./ova-job-view-model";
import type { PhaseWithContent } from "./types";

const phaseRank = (phaseType: string): number => {
  const index = PHASE_ORDER.indexOf(phaseType);
  return index < 0 ? PHASE_ORDER.length : index;
};

/**
 * Fases del editor: las que tienen recursos más las que se eligieron al crear
 * el OVA (del último job). Sin estas, una fase cuyo único recurso falló
 * desaparecía y no había dónde pulsar «Añadir recurso».
 */
export function sectionTypes(phases: PhaseWithContent[], configured: string[] = []): string[] {
  const seen = new Set<string>();
  for (const phase of phases) seen.add(phase.phase_type);
  for (const phaseType of configured) seen.add(phaseType);
  return Array.from(seen).sort((a, b) => phaseRank(a) - phaseRank(b));
}
