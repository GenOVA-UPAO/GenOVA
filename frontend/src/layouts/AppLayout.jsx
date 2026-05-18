import { MainContainer } from '../layout/components/MainContainer.jsx'
import { Navbar } from '../layout/components/Navbar.jsx'
import { Sidebar } from '../layout/components/Sidebar.jsx'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <div className="flex w-full flex-1">
        <Sidebar />
        <MainContainer />
      </div>
    </div>
  )
}
