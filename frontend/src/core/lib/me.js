// Per-session cache of the current user (GET /api/auth/me).
//
// AdminRoute (and any guard) used to refetch /api/auth/me on every mount,
// hitting the network on each admin navigation. We memoize the in-flight
// promise so concurrent/repeat callers share one request (Vercel:
// client-swr-dedup). Cleared on logout via clearCurrentUser().

import { apiFetch } from './http.js'

let cache = null

export function getCurrentUser() {
  if (!cache) {
    cache = (async () => {
      try {
        const res = await apiFetch('/api/auth/me')
        if (res.status === 200) return await res.json()
      } catch {
        /* network/abort — fall through */
      }
      cache = null // don't cache failures; let the next caller retry
      return null
    })()
  }
  return cache
}

export function clearCurrentUser() {
  cache = null
}
