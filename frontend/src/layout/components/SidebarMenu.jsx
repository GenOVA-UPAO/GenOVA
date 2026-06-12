import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { navigationLinks } from '../navigation/navLinks.js'
import { isLoggedIn } from '../../lib/auth.js'
import { apiFetch } from '../../lib/http.js'
import { fetchTrashCount } from '../../services/ovaHistoryService.js'

function getSidebarLinkClasses({ isActive }) {
  if (isActive) {
    return 'flex items-center justify-between rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm'
  }
  return 'flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent transition-colors'
}

export function SidebarMenu() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [trashCount, setTrashCount] = useState(0)
  const location = useLocation()

  useEffect(() => {
    if (!isLoggedIn()) return

    const checkRole = async () => {
      try {
        const response = await apiFetch('/api/auth/me')
        if (response.status === 200) {
          const user = await response.json()
          setIsAdmin(user.role === 'administrador')
        }
      } catch {
        /* rol no disponible: el menú admin queda oculto */
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
              <span className="ml-2 rounded-full bg-destructive px-1.5 py-0.5 text-xs font-bold text-white min-w-[1.25rem] text-center">
                {trashCount}
              </span>
            )}
          </NavLink>
        </li>
      </ul>
      {isAdmin && (
        <div className="pt-4 border-t border-border">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
            <li>
              <NavLink to="/admin/labs" className={getSidebarLinkClasses}>
                Labs
              </NavLink>
            </li>
          </ul>
        </div>
      )}
    </nav>
  )
}
export default SidebarMenu
