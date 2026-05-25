export function isLockedOut(user) {
  if (!user?.locked_until) return false
  return new Date(user.locked_until) > new Date()
}
