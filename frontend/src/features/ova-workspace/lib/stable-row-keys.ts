import type { PhaseWithContent } from "./types";

export interface RowKeySnapshot {
  phases: PhaseWithContent[];
  keys: Map<string, string>;
}

/**
 * Asigna a cada recurso una key de fila que sobrevive a un cambio de versión.
 * Guardar, eliminar o regenerar crea una versión nueva y todos los recursos
 * cambian de id, pero conservan su `phase_order`: el recurso nuevo hereda la
 * key del anterior que ocupaba esa posición. Así la fila no se remonta y no se
 * pierde el HTML sin guardar de otro recurso. Un reordenamiento no cambia ids,
 * así que cada fila conserva su key aunque cambie de posición.
 */
export function nextRowKeys(previous: RowKeySnapshot, phases: PhaseWithContent[]): Map<string, string> {
  const currentIds = new Set(phases.map((phase) => phase.id));
  const orphanByOrder = new Map<unknown, string>();
  for (const phase of previous.phases) {
    const key = previous.keys.get(phase.id);
    if (key && !currentIds.has(phase.id) && phase.phase_order !== undefined) {
      orphanByOrder.set(phase.phase_order, key);
    }
  }
  const used = new Set<string>();
  const keys = new Map<string, string>();
  for (const phase of phases) {
    const candidates = [previous.keys.get(phase.id), orphanByOrder.get(phase.phase_order), phase.id];
    const key = candidates.find((value): value is string => value !== undefined && !used.has(value)) ?? phase.id;
    used.add(key);
    keys.set(phase.id, key);
  }
  return keys;
}
