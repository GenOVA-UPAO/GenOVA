// Current user (GET /api/auth/me) with an SWR-style persistent cache.
//
// The role drives sidebar/admin-route rendering. Refetching on every mount
// caused two problems on a hard reload (direct URL, not in-app nav):
//   1. A visible flash where the sidebar rendered the "Usuario" placeholder
//      (and hid the Administración section) until /api/auth/me resolved.
//   2. An intermittent stick where a single shared in-flight promise resolved
//      to null on a transient failure and poisoned every consumer that awaited
//      it — leaving an admin shown as a regular user until the next remount.
//
// Fix: cache the resolved user in sessionStorage. Consumers seed their initial
// state synchronously from the cache (no flash, correct role immediately), then
// revalidate in the background. A transient failure falls back to the last known
// user instead of null, so the role never regresses mid-session.

import { apiFetch } from './http.js'

const STORAGE_KEY = 'genova_me'
let inflight = null

function readCache() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(user) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    /* storage unavailable — in-memory fetch still works */
  }
}

// Synchronous last-known user, for seeding component state without a flash.
export function getCachedUser() {
  return readCache()
}

// Revalidate against the server. Dedupes concurrent callers via a shared
// in-flight promise. On success the cache is refreshed; on a transient failure
// the last known user is returned so consumers never regress to null.
export function getCurrentUser() {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const res = await apiFetch('/api/auth/me')
      if (res.status === 200) {
        const user = await res.json()
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

export function clearCurrentUser() {
  inflight = null
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
