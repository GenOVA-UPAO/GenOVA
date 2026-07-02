export function getRoleColor(name: string): string {
  switch (name.toLowerCase()) {
    case "administrador":
      return "bg-primary text-primary-foreground border-primary/20 shadow-md shadow-primary/20";
    case "usuario":
      return "bg-accent-brand text-white border-accent-brand/20 shadow-md shadow-accent-brand/20";
    default:
      return "bg-emerald-500 text-white border-emerald-500/20 shadow-md shadow-emerald-500/20";
  }
}

export function isSystemRole(name?: string): boolean {
  if (!name) return false;
  return ["administrador", "usuario"].includes(name.toLowerCase());
}
