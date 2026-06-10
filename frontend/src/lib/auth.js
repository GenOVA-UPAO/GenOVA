// Hybrid auth state.
//
// Source of truth for HTTP auth is the httpOnly `genova_token` cookie set by
// the backend on /login. JS can't read it, so we keep a separate non-secret
// `genova_session` flag (plus the legacy JWT for backwards-compat with the
// cucumber unit suite) to drive client-side routing decisions.

const SESSION_KEY = 'genova_session'
const TOKEN_KEY = 'genova_token'  // legacy — kept for unit tests; do NOT send as Bearer

function safeLocalStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

export function markLoggedIn() {
  const ls = safeLocalStorage()
  if (ls) ls.setItem(SESSION_KEY, '1')
}

export function clearSession() {
  const ls = safeLocalStorage()
  if (ls) {
    ls.removeItem(SESSION_KEY)
    ls.removeItem(TOKEN_KEY)
  }
  // Best-effort cookie clear. Imported lazily so tests don't pull http.js
  // network code when they only exercise the localStorage shim.
  return import('./http.js')
    .then(({ apiFetch }) => apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {}))
    .catch(() => {})
}

export function isLoggedIn() {
  const ls = safeLocalStorage()
  if (!ls) return false
  if (ls.getItem(SESSION_KEY) === '1') return true
  const token = ls.getItem(TOKEN_KEY)
  if (token && !isTokenExpired(token)) return true
  return false
}

// ── Legacy API (still used by unit tests + a few hooks during transition). ──

export function saveToken(token) {
  const ls = safeLocalStorage()
  if (!ls) return
  if (token) ls.setItem(TOKEN_KEY, token)
  ls.setItem(SESSION_KEY, '1')
}

export function clearToken() {
  const ls = safeLocalStorage()
  if (!ls) return
  ls.removeItem(TOKEN_KEY)
  ls.removeItem(SESSION_KEY)
}

export function getToken() {
  const ls = safeLocalStorage()
  return ls ? ls.getItem(TOKEN_KEY) : null
}

export function decodeToken(token) {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    return JSON.parse(atob(parts[1]))
  } catch {
    return null
  }
}

export function isTokenExpired(token) {
  const payload = decodeToken(token)
  if (!payload?.exp) return true
  return Date.now() >= payload.exp * 1000
}
