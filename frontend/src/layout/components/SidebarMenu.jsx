import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { navigationLinks } from '../navigation/navLinks.js'
import { getToken } from '../../lib/auth.js'
import { fetchTrashCount } from '../../services/ovaHistoryService.js'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

function getSidebarLinkClasses({ isActive }) {
  if (isActive) {
    return 'flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm'
  }
  return 'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors'
}

export function SidebarMenu() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [trashCount, setTrashCount] = useState(0)
  const location = useLocation()

  useEffect(() => {
    const token = getToken()
    if (!token) return

    const checkRole = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.status === 200) {
          const user = await response.json()
          setIsAdmin(user.role === 'administrador')
        }
      } catch {
      }
    }

    checkRole()
  }, [])

  useEffect(() => {
    fetchTrashCount()
      .then((data) => setTrashCount(data.count || 0))
      .catch(() => {})
  }, [location.pathname])

  return (
    <nav aria-label="Navegación principal" className="space-y-4">
      <ul className="space-y-1.5">
        {navigationLinks.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} className={getSidebarLinkClasses}>
              {item.label}
            </NavLink>
          </li>
        ))}
        <li>
          <NavLink to="/papelera" className={getSidebarLinkClasses}>
            <span>Papelera</span>
            {trashCount > 0 && (
              <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white min-w-[1.25rem] text-center">
                {trashCount}
              </span>
            )}
          </NavLink>
        </li>
      </ul>
      {isAdmin && (
        <div className="pt-4 border-t border-slate-100">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Administración
          </p>
          <ul className="space-y-1.5">
            <li>
              <NavLink to="/admin/roles" className={getSidebarLinkClasses}>
                Gestión de Roles
              </NavLink>
            </li>
            <li>
              <NavLink to="/admin/users" className={getSidebarLinkClasses}>
                Gestión de Usuarios
              </NavLink>
            </li>
          </ul>
        </div>
      )}
    </nav>
  )
}
export default SidebarMenu
