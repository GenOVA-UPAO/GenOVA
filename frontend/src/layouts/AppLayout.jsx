import { MainContainer } from '../layout/components/MainContainer.jsx'
import { Navbar } from '../layout/components/Navbar.jsx'
import { Sidebar } from '../layout/components/Sidebar.jsx'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl">
        <Sidebar />
        <MainContainer />
      </div>
    </div>
  )
}
