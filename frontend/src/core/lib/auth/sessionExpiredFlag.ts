// Single-session broadcast channel for "your session expired" between the
// AuthGate (which detects the event) and the LoginPage (which surfaces the
// message). Uses sessionStorage so a hard refresh still shows the toast.
//
// BU-001: lives in `core/lib/auth/` because the flag is shared by the gate
// (in `features/auth/components/`) and the login page (in
// `features/auth/pages/`); screaming-arch keeps auth cross-domain code in
// `core`.

const SESSION_EXPIRED_KEY = 'genova:session_expired'

export function flagSessionExpired(): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, '1')
  } catch {
    /* storage unavailable */
  }
}

export function consumeSessionExpiredFlag(): boolean {
  if (typeof sessionStorage === 'undefined') return false
  try {
    if (sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1') {
      sessionStorage.removeItem(SESSION_EXPIRED_KEY)
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

export function clearSessionExpiredFlag(): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(SESSION_EXPIRED_KEY)
  } catch {
    /* ignore */
  }
}
