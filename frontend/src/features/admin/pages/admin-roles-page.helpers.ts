export function isSystemRole(name?: string): boolean {
  if (!name) return false;
  return ["administrador", "usuario"].includes(name.toLowerCase());
}
