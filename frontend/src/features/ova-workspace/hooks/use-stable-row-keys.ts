import { useState } from "react";

import { nextRowKeys, type RowKeySnapshot } from "../lib/stable-row-keys";
import type { PhaseWithContent } from "../lib/types";

const signature = (phases: PhaseWithContent[]): string =>
  phases.map((phase) => `${phase.id}:${String(phase.phase_order)}`).join("|");

/** Keys de fila estables entre versiones del OVA (ver `nextRowKeys`). */
export function useStableRowKeys(phases: PhaseWithContent[]): (phase: PhaseWithContent) => string {
  const [snapshot, setSnapshot] = useState<RowKeySnapshot>(() => ({
    phases,
    keys: nextRowKeys({ phases: [], keys: new Map() }, phases),
  }));
  let current = snapshot;
  if (signature(snapshot.phases) !== signature(phases)) {
    // Patrón de React para derivar estado de la render anterior sin efectos.
    current = { phases, keys: nextRowKeys(snapshot, phases) };
    setSnapshot(current);
  }
  return (phase) => current.keys.get(phase.id) ?? phase.id;
}
