import type { AdminUser } from "../lib/types";

export function isLockedOut(user: AdminUser): boolean {
  if (!user.locked_until) return false;
  const lockedUntil = new Date(user.locked_until).getTime();
  return lockedUntil > Date.now();
}
