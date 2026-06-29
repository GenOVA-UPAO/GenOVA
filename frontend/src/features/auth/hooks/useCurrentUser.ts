// Reactive current-user state, shared by every consumer that needs the
// authenticated profile (Navbar, Sidebar, Dashboard, AdminRoute).
//
// BU-001: replaces 4 copies of `useState(getCachedUser()) + useEffect(getCurrentUser())`
// with one source of truth. Exposes `isExpired` so the AuthGate can render a
// redirect, and `refresh` so callers can force a revalidation after a mutation.

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

export function useCurrentUser(): CurrentUserState {
  const [user, setUser] = useState<MeUser | null>(() => getCachedUser())
  const [loading, setLoading] = useState(true)
  const [isExpired, setIsExpired] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setIsExpired(false)
    const next = await getCurrentUser()
    setUser(next)
    setIsExpired(next === null && getCachedUser() === null)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const next = await getCurrentUser()
      if (cancelled) return
      setUser(next)
      setIsExpired(next === null && getCachedUser() === null)
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
