import { t } from "i18next";

/**
 * Nombre legible de un rol: los roles se guardan como identificadores
 * («usuarios_prueba», «administrador») y la interfaz los muestra en mayúscula
 * de oración («Usuarios prueba», «Administrador»).
 */
export function formatRoleName(roleName: string | null | undefined): string {
  if (!roleName) return t("admin:roles.utils.noRole");
  const spaced = roleName.replaceAll("_", " ").trim();
  if (spaced === "") return t("admin:roles.utils.noRole");
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
  if (count === 0) return t("admin:roles.utils.noUsers");
  return t("admin:roles.utils.userCount", { count });
}
