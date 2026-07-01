import { Outlet } from 'react-router'
import { MainContainer } from '@/core/layouts/components/MainContainer.tsx'
import { Navbar } from '@/core/layouts/components/Navbar.tsx'
import { Sidebar } from '@/core/layouts/components/Sidebar.tsx'

// BU-001 (Hallazgo #3): el gating de sesión (`<AuthGate>`) se centraliza en
// `App.tsx` (`ProtectedLayout` / `FullBleedProtectedLayout`). Antes este
// layout envolvía su contenido en `<AuthGate>`, lo que producía doble wrapping
// bajo `ProtectedLayout`. `AppLayout` solo aporta layout — sin auth.
interface AppLayoutProps {
  /** fullBleed=true → Outlet directo sin max-width (para workspace). */
  fullBleed?: boolean
}

export function AppLayout({ fullBleed = false }: AppLayoutProps) {
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