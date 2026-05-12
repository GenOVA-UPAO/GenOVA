import { NavLink } from 'react-router'
import { navigationLinks } from '../navigation/navLinks.js'

function getSidebarLinkClasses({ isActive }) {
  if (isActive) {
    return 'block rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white'
  }

  return 'block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200'
}

export function SidebarMenu() {
  return (
    <nav aria-label="Navegación principal">
      <ul className="space-y-2">
        {navigationLinks.map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} className={getSidebarLinkClasses}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
