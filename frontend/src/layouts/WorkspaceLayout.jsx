import { Navigate, Outlet } from 'react-router'
import { isLoggedIn } from '../lib/auth.js'
import { Navbar } from '../layout/components/Navbar.jsx'

/**
 * Full-bleed layout for the OVA workspace: Navbar + full-width/full-height Outlet.
 * No sidebar, no padding, no max-width — the workspace needs every pixel.
 * Auth-checks the same way as ProtectedLayout.
 */
export function WorkspaceLayout() {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
