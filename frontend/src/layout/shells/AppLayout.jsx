import { MainContainer } from '../components/MainContainer.jsx'
import { Navbar } from '../components/Navbar.jsx'
import { Sidebar } from '../components/Sidebar.jsx'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex w-full flex-1">
        <Sidebar />
        <MainContainer />
      </div>
    </div>
  )
}
