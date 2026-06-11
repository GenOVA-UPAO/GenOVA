import { Navigate, Outlet } from 'react-router'
import { isLoggedIn } from '../../lib/auth.js'
import { Navbar } from '../components/Navbar.jsx'
import { Sidebar } from '../components/Sidebar.jsx'

/**
 * Workspace layout: Navbar + app Sidebar + a full-bleed Outlet (no max-width,
 * no padding) so the split-panel workspace fills the remaining space. The
 * Sidebar lives above the Outlet, so it stays mounted through the in-place
 * create→edit morph — create and edit feel like one continuous page.
 * Auth-checks the same way as ProtectedLayout.
 */
export function WorkspaceLayout() {
  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex w-full flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
