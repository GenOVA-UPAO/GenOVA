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
