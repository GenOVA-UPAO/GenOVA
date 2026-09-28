export function isSystemRole(name?: string): boolean {
  if (!name) return false;
  return ["administrador", "usuario"].includes(name.toLowerCase());
}

/** El modo tesis asigna este rol a las cuentas nuevas buscándolo por su nombre. */
export const TESIS_ROLE = "usuarios_prueba";

/** El rol del modo tesis: no se renombra ni se elimina (el registro lo necesita). */
export function isThesisRole(name?: string): boolean {
  return name?.toLowerCase() === TESIS_ROLE;
}
