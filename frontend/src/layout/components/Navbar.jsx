import { useState } from 'react'
import { useNavigate } from 'react-router'
import { NavbarBrand } from './NavbarBrand.jsx'
import { NavbarMenuItems } from './NavbarMenuItems.jsx'
import { SidebarMenu } from './SidebarMenu.jsx'
import { clearSession } from '../../lib/auth.js'

export function Navbar() {
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await clearSession()
    navigate('/login')
  }

  return (
    <header className="border-b border-slate-200 bg-white relative z-50">
      <div className="flex w-full items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <NavbarBrand />
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <NavbarMenuItems />
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white absolute top-full left-0 w-full shadow-lg">
          <div className="px-4 py-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Menú Móvil</p>
            <div onClick={() => setIsMobileMenuOpen(false)}>
              <SidebarMenu />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
