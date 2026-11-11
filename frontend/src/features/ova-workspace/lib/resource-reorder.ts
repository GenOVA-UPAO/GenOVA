export function applyReorder<T>(items: T[], fromIdx: number, toIdx: number): T[] {
  if (fromIdx === toIdx) return items;
  const updated = [...items];
  const [moved] = updated.splice(fromIdx, 1);
  updated.splice(toIdx, 0, moved);
  return updated;
}

export function allSamePhaseType(phaseTypes: string[]): boolean {
  return new Set(phaseTypes).size <= 1;
}

export interface PhaseReorder {
  phase_id: string;
  new_order: number;
}

interface OrderedPhase {
  id: string;
  phase_type: string;
  phase_order?: unknown;
}

/**
 * Cuerpo del PATCH de reordenamiento para una sola fase 5E. El backend
 * rechaza con 422 (`cross_phase_move`) cualquier lista con varios tipos, así
 * que solo viajan los recursos del grupo, cada uno con una de las posiciones
 * que el grupo ya ocupaba: los recursos de las otras fases no se mueven.
 */
export function groupReorderPayload<T extends OrderedPhase>(
  phases: T[],
  phaseType: string,
  group: T[],
): PhaseReorder[] {
  const current = phases.filter((phase) => phase.phase_type === phaseType);
  const stored = current.map((phase) => phase.phase_order);
  const usable =
    stored.every((order) => typeof order === "number") && new Set(stored).size === stored.length;
  const orders = usable
    ? stored.toSorted((a, b) => a - b)
    : phases.flatMap((phase, index) => (phase.phase_type === phaseType ? [index] : []));
  return group.map((phase, index) => ({ phase_id: phase.id, new_order: orders[index] }));
}
