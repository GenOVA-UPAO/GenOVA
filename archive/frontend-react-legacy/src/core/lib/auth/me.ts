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
//
// BU-002: network/abort failures now let the exception propagate to the caller
// instead of silently swallowing it into `readCache()`. Consumers (notably
// `useCurrentUser`) explicitly distinguish three cases:
//   - 200 → fresh user → writeCache + return
//   - 401 → clearCurrentUser + return null (BU-001 broadcast)
//   - network/abort → re-throw, caller decides whether to fall back to cache
// This kills the "stale snapshot from a previous user wins" symptom observed
// in BU-002: a hook now sees a hard failure and can choose to ignore the
// cached snapshot for that user instead of trusting it blindly.

import { apiFetch } from '../http/client'

export interface MeUser {
  id?: string | number
  role?: string
  email?: string
  full_name?: string
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
// in-flight promise. On success the cache is refreshed; on 401 the cache is
// cleared (BU-001 broadcast). Network/abort errors RE-THROW so the caller
// can decide what to do (BU-002: previously this code path silently returned
// `readCache()` — see commit message for rationale).
export async function getCurrentUser(): Promise<MeUser | null> {
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
      // Any other HTTP error is treated as transient — let the caller decide.
      throw new Error(`me: unexpected status ${res.status}`)
    } finally {
      inflight = null
    }
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