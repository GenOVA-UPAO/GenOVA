// Hybrid auth state.
//
// Source of truth for HTTP auth is the httpOnly `genova_token` cookie set by
// the backend on /login. JS can't read it, so we keep a separate non-secret
// `genova_session` flag (plus the legacy JWT for backwards-compat with the
// cucumber unit suite) to drive client-side routing decisions.

import { clearCurrentUser } from '../../../core/lib/auth/me'

const SESSION_KEY = 'genova_session'
const TOKEN_KEY = 'genova_token' // legacy — kept for unit tests; do NOT send as Bearer

interface JwtPayload {
  exp?: number
  [key: string]: unknown
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

export function markLoggedIn(): void {
  const ls = safeLocalStorage()
  if (ls) ls.setItem(SESSION_KEY, '1')
}

export function clearSession(): Promise<void> {
  const ls = safeLocalStorage()
  if (ls) {
    ls.removeItem(SESSION_KEY)
    ls.removeItem(TOKEN_KEY)
  }
  clearCurrentUser()
  // Best-effort cookie clear. http client imported lazily so tests that only
  // exercise the localStorage shim don't pull its network code at module load.
  return import('../../../core/lib/http/client')
    .then(({ apiFetch }) => {
      apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    })
    .catch(() => {})
}

export function isLoggedIn(): boolean {
  const ls = safeLocalStorage()
  if (!ls) return false
  if (ls.getItem(SESSION_KEY) === '1') return true
  const token = ls.getItem(TOKEN_KEY)
  if (token && !isTokenExpired(token)) return true
  return false
}

// ── Legacy API (still used by unit tests + a few hooks during transition). ──

export function saveToken(token: string | null): void {
  const ls = safeLocalStorage()
  if (!ls) return
  if (token) ls.setItem(TOKEN_KEY, token)
  ls.setItem(SESSION_KEY, '1')
}

export function clearToken(): void {
  const ls = safeLocalStorage()
  if (!ls) return
  ls.removeItem(TOKEN_KEY)
  ls.removeItem(SESSION_KEY)
}

export function getToken(): string | null {
  const ls = safeLocalStorage()
  return ls ? ls.getItem(TOKEN_KEY) : null
}

export function decodeToken(token: string | null): JwtPayload | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    return JSON.parse(atob(parts[1])) as JwtPayload
  } catch {
    return null
  }
}

export function isTokenExpired(token: string | null): boolean {
  const payload = decodeToken(token)
  if (!payload?.exp) return true
  return Date.now() >= payload.exp * 1000
}
