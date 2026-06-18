import { MainContainer } from '../components/MainContainer.jsx'
import { Navbar } from '../components/Navbar.jsx'
import { Sidebar } from '../components/Sidebar.jsx'

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
