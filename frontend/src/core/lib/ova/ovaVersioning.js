// Lógica pura de versiones del OVA (HU-028). Sin React/red.

/** Versiones de más reciente a más antigua (por version_number desc). */
export function sortVersionsDesc(versions) {
  return [...(versions ?? [])].sort((a, b) => b.version_number - a.version_number)
}

/** Primera versión marcada activa, o null. */
export function findActiveVersion(versions) {
  return (versions ?? []).find((v) => v.is_active) ?? null
}
