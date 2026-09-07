export function getRoleColorClasses(roleName: string | null | undefined): string {
  if (!roleName) return "bg-muted text-muted-foreground border-border";

  const normalizedRole = roleName.toLowerCase().trim();

  switch (normalizedRole) {
    case "administrador":
    case "admin":
      return "bg-primary/10 text-primary border-primary/20";
    case "profesor":
    case "teacher":
      return "bg-accent-brand/10 text-accent-brand border-accent-brand/25";
    case "estudiante":
    case "student":
      return "bg-primary/5 text-primary border-primary/15";
    case "usuario":
    case "user":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
