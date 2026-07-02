// Reactive current-user state, shared by every consumer that needs the
// authenticated profile (Navbar, Sidebar, Dashboard, AdminRoute).
//
// BU-001: replaces 4 copies of `useState(getCachedUser()) + useEffect(getCurrentUser())`
// with one source of truth. Exposes `isExpired` so the AuthGate can render a
// redirect, and `refresh` so callers can force a revalidation after a mutation.
//
// BU-002: `getCurrentUser()` now propagates network/abort failures instead of
// silently returning the cached snapshot. We catch here and fall back to
// `getCachedUser()` ONLY for the transient-error case (so the role never
// regresses to null mid-session); 401 is still handled inside `getCurrentUser`
// itself (it returns null + broadcasts `auth:expired`). The hook is the single
// point that decides "transient → keep last-known; hard fail → null".

import { useCallback, useEffect, useState } from 'react'
import {
  getCachedUser,
  getCurrentUser,
  type MeUser,
} from '@/core/lib/auth/me'

export interface CurrentUserState {
  user: MeUser | null
  loading: boolean
  isAdmin: boolean
  isExpired: boolean
  refresh: () => Promise<void>
}

async function fetchOrFallback(): Promise<{ user: MeUser | null; expired: boolean }> {
  try {
    const next = await getCurrentUser()
    return { user: next, expired: next === null && getCachedUser() === null }
  } catch {
    // BU-002: network/abort failure → keep last-known user instead of null.
    // The 401 path is handled inside getCurrentUser (returns null + broadcasts).
    return { user: getCachedUser(), expired: false }
  }
}

export function useCurrentUser(): CurrentUserState {
  const [user, setUser] = useState<MeUser | null>(() => getCachedUser())
  const [loading, setLoading] = useState(true)
  const [isExpired, setIsExpired] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setIsExpired(false)
    const { user: next, expired } = await fetchOrFallback()
    setUser(next)
    setIsExpired(expired)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { user: next, expired } = await fetchOrFallback()
      if (cancelled) return
      setUser(next)
      setIsExpired(expired)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return {
    user,
    loading,
    isAdmin: user?.role === 'administrador',
    isExpired,
    refresh,
  }
}