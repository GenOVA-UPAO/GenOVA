import type { MeUser } from "@/core/auth/auth.service";
import { firstNonBlank } from "@/core/lib/text";

export function userInitials(user: MeUser | null): string {
  const name = firstNonBlank(user?.full_name, user?.email) ?? "Usuario";
  return name
    .split(/\s|@/)
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function hasPermission(user: MeUser | null, permission: string): boolean {
  const permissions = user?.permissions ?? [];
  return user?.role === "administrador" || permissions.includes(permission);
}

export function navLinkClasses(isActive: boolean): string {
  const base =
    "relative flex h-11 w-full items-center md:h-9 gap-3 rounded-lg px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
  return isActive
    ? `${base} bg-primary/10 text-primary before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-primary dark:bg-primary/15`
    : `${base} text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`;
}

export function profileLinkClasses(isActive: boolean): string {
  return `flex items-center gap-3 rounded-lg px-2 py-2 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${
    isActive ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-sidebar-accent"
  }`;
}
