/**
 * Nombre legible de un rol: los roles se guardan como identificadores
 * («usuarios_prueba», «administrador») y la interfaz los muestra en mayúscula
 * de oración («Usuarios prueba», «Administrador»).
 */
export function formatRoleName(roleName: string | null | undefined): string {
  if (!roleName) return "Sin rol";
  const spaced = roleName.replaceAll("_", " ").trim();
  if (spaced === "") return "Sin rol";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Descripción de rol lista para mostrar: algunas del seed usan « — » como
 * separador; se muestra con dos puntos para mantener un texto llano.
 */
export function formatRoleDescription(description: string | null | undefined): string {
  if (!description) return "";
  return description.replaceAll(" — ", ": ").replaceAll(" – ", ": ").trim();
}

export function roleUserCountLabel(count: number): string {
  if (count === 0) return "Sin usuarios";
  return count === 1 ? "1 usuario" : `${String(count)} usuarios`;
}
