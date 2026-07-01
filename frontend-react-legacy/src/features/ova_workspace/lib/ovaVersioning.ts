// Lógica pura de versiones del OVA (HU-028). Sin React/red.

export interface OvaVersion {
  version_number: number
  is_active?: boolean
}

/** Versiones de más reciente a más antigua (por version_number desc). */
export function sortVersionsDesc<T extends OvaVersion>(
  versions?: T[] | null,
): T[] {
  return [...(versions ?? [])].sort(
    (a, b) => b.version_number - a.version_number,
  )
}

/** Primera versión marcada activa, o null. */
export function findActiveVersion<T extends OvaVersion>(
  versions?: T[] | null,
): T | null {
  return (versions ?? []).find((v) => v.is_active) ?? null
}
