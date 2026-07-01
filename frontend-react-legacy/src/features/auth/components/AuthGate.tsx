// Single point that listens for `auth:expired` (dispatched by
// `clearCurrentUser` in core/lib/auth/me) and redirects to /login. Consumers
// that need the current user stay decoupled from session lifecycle.
// BU-001 AC#1/#2/#3: route protection, no "no autenticado" flash, 401 → redirect.

import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { getCachedUser, getCurrentUser } from '@/core/lib/auth/me'
import { flagSessionExpired } from '@/core/lib/auth/sessionExpiredFlag'
import { AuthGateLoader } from '@/features/auth/components/AuthGateLoader'
import { isLoggedIn } from '@/features/auth/services/auth'

interface AuthGateProps {
  children: React.ReactNode
  redirect?: string
}

export function AuthGate({
  children,
  redirect = '/login',
}: AuthGateProps): React.ReactElement {
  const location = useLocation()
  const cached = getCachedUser()
  const [authed, setAuthed] = useState(Boolean(cached))
  const [validating, setValidating] = useState(!cached)
  const [expired, setExpired] = useState(false)

  // Optimistic gate: only block on /api/auth/me if local state claims a
  // session. Avoids the "no autenticado" flash while the request is in flight.
  useEffect(() => {
    if (!isLoggedIn() && !cached) {
      setValidating(false)
      setAuthed(false)
      return
    }
    const ctrl = { cancelled: false }
    getCurrentUser().then((u) => {
      if (ctrl.cancelled) return
      setAuthed(Boolean(u))
      setValidating(false)
    })
    return () => {
      ctrl.cancelled = true
    }
  }, [location.pathname])

  useEffect(() => {
    function onExpired() {
      flagSessionExpired()
      setExpired(true)
    }
    window.addEventListener('auth:expired', onExpired)
    return () => window.removeEventListener('auth:expired', onExpired)
  }, [])

  if (expired) return <Navigate to={redirect} replace state={{ sessionExpired: true }} />
  if (validating) return <AuthGateLoader />
  if (!authed) return <Navigate to={redirect} replace />
  return <>{children}</>
}
