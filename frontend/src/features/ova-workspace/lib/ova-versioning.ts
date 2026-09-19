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
