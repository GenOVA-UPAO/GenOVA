import type { MeUser } from "@/core/auth/auth.service";

export function canAccessModels(user: MeUser | null): boolean {
  if (!user) return true;
  if (user.role === "administrador") return true;
  const perms = user.permissions ?? [];
  return perms.includes("ai:models:self") || perms.includes("ai:models:platform");
}
