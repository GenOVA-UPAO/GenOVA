// Current user (GET /api/auth/me) with an SWR-style persistent cache.
//
// The role drives sidebar/admin-route rendering. Consumers seed their initial
// state synchronously from sessionStorage (no flash, correct role immediately),
// then revalidate in the background. A transient failure falls back to the last
// known user instead of null, so the role never regresses mid-session.

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

export function clearCurrentUser(): void {
  inflight = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
