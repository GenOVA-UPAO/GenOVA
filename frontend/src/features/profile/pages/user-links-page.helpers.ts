import type { MeUser } from "@/core/auth/auth.service";

export function canLink(user: MeUser | null, permission: string): boolean {
  const permissions = (user?.permissions as string[] | undefined) ?? [];
  return user?.role === "administrador" || permissions.includes(permission);
}
