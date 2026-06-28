import { Navigate, Outlet } from 'react-router'
import { MainContainer } from '@/core/layouts/components/MainContainer.tsx'
import { Navbar } from '@/core/layouts/components/Navbar.tsx'
import { Sidebar } from '@/core/layouts/components/Sidebar.tsx'
import { isLoggedIn } from '@/features/auth/services/auth'

interface AppLayoutProps {
  /** fullBleed=true → Outlet directo sin max-width (para workspace).
   *  También activa el auth guard de sesión. */
  fullBleed?: boolean
}

export function AppLayout({ fullBleed = false }: AppLayoutProps) {
  if (fullBleed && !isLoggedIn()) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Navbar />
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <Sidebar />
        {fullBleed ? (
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <Outlet />
          </main>
        ) : (
          <MainContainer />
        )}
      </div>
    </div>
  )
}
