import { useNavigate } from 'react-router'
import { NavbarBrand } from './NavbarBrand.jsx'
import { NavbarMenuItems } from './NavbarMenuItems.jsx'
import { clearToken } from '../../lib/auth.js'

export function Navbar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    clearToken()
    navigate('/login')
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <NavbarBrand />
        <div className="flex items-center gap-3">
          <NavbarMenuItems />
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  )
}
