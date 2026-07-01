export function isLockedOut(
  user?: { locked_until?: string | null } | null,
): boolean {
  if (!user?.locked_until) return false
  return new Date(user.locked_until) > new Date()
}
