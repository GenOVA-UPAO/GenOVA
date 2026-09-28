export interface OvaVersionRow {
  id: string;
  version_number: number;
  is_active?: boolean;
  created_at?: string;
}

/** Versiones de más reciente a más antigua (por version_number desc). */
export function sortVersionsDesc<T extends { version_number: number }>(versions?: T[] | null): T[] {
  return [...(versions ?? [])].sort((a, b) => b.version_number - a.version_number);
}

/** Ids de comparación: siempre [más antigua, más nueva] para etiquetar Anterior/Posterior. */
export function orderedVersionIds(ids: string[], versions: OvaVersionRow[]): [string, string] {
  const pair = versions.filter((version) => ids.includes(version.id));
  const sorted = [...pair].sort((a, b) => a.version_number - b.version_number);
  return [sorted[0]?.id ?? ids[0], sorted[1]?.id ?? ids[1]];
}
