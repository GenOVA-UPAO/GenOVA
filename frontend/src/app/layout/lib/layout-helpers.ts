import type { MeUser } from "@/core/auth/auth.service";

export function userInitials(user: MeUser | null): string {
  const name = user?.full_name || user?.email || "Usuario";
  return name
    .split(/\s|@/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function hasPermission(user: MeUser | null, permission: string): boolean {
  const permissions = (user?.permissions as string[] | undefined) ?? [];
  return user?.role === "administrador" || permissions.includes(permission);
}

export function navLinkClasses(isActive: boolean): string {
  const base =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
  return isActive
    ? `${base} bg-primary text-primary-foreground shadow-sm`
    : `${base} text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`;
}

export function profileLinkClasses(isActive: boolean): string {
  return `flex items-center gap-3 rounded-lg px-2 py-2 transition-colors ${
    isActive ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-sidebar-accent"
  }`;
}
