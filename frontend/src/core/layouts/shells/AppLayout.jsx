import { MainContainer } from '@/core/layouts/components/MainContainer.jsx'
import { Navbar } from '@/core/layouts/components/Navbar.jsx'
import { Sidebar } from '@/core/layouts/components/Sidebar.jsx'

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <Navbar />
      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <Sidebar />
        <MainContainer />
      </div>
    </div>
  )
}
