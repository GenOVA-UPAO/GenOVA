// Current user (GET /api/auth/me) with an SWR-style persistent cache.
//
// The role drives sidebar/admin-route rendering. Consumers seed their initial
// state synchronously from sessionStorage (no flash, correct role immediately),
// then revalidate in the background. A transient failure falls back to the last
// known user instead of null, so the role never regresses mid-session.
//
// BU-001: `clearCurrentUser()` also dispatches a `auth:expired` window event
// so the single AuthGate listener can redirect to /login without each
// consumer needing to subscribe individually. The lightweight
// `clearLocalCache()` is exported separately for `markLoggedIn()` flows that
// only want to drop stale cache, not broadcast a logout.

import { apiFetch } from '../http/client'

export interface MeUser {
  id?: string | number
  role?: string
  email?: string
  [key: string]: unknown
}

const STORAGE_KEY = 'genova_me'
let inflight: Promise<MeUser | null> | null = null

function readCache(): MeUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as MeUser) : null
  } catch {
    return null
  }
}

function writeCache(user: MeUser): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    /* storage unavailable — in-memory fetch still works */
  }
}

function safeRemoveItem(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

// Synchronous last-known user, for seeding component state without a flash.
export function getCachedUser(): MeUser | null {
  return readCache()
}

// Revalidate against the server. Dedupes concurrent callers via a shared
// in-flight promise. On success the cache is refreshed; on a transient failure
// the last known user is returned so consumers never regress to null.
export function getCurrentUser(): Promise<MeUser | null> {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await apiFetch('/api/auth/me')
      if (res.status === 200) {
        const user = (await res.json()) as MeUser
        writeCache(user)
        return user
      }
      if (res.status === 401) {
        clearCurrentUser()
        return null
      }
    } catch {
      /* network/abort — fall through to cached value */
    } finally {
      inflight = null
    }
    return readCache()
  })()
  return inflight
}

// Drop the local cache + broadcast `auth:expired` so the AuthGate redirects.
// Source: 'me' for the /api/auth/me 401 path; 'logout' for explicit logout.
export function clearCurrentUser(source: 'me' | 'logout' = 'me'): void {
  inflight = null
  safeRemoveItem()
  dispatchExpired(source)
}

// Same effect without broadcasting — used by `markLoggedIn()` to avoid
// showing a previous user's data after a fresh login.
export function clearLocalCache(): void {
  inflight = null
  safeRemoveItem()
}

function dispatchExpired(source: 'me' | 'logout'): void {
  if (typeof window === 'undefined') return
  try {
    window.dispatchEvent(
      new CustomEvent('auth:expired', { detail: { source } }),
    )
  } catch {
    /* window unavailable (e.g. unit tests without happy-dom) */
  }
}
