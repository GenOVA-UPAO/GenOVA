import { NavLink } from 'react-router'
import { navigationLinks } from '../navigation/navLinks.js'

function getLinkClasses({ isActive }) {
  if (isActive) {
    return 'rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground'
  }

  return 'rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent'
}

export function NavbarMenuItems() {
  return (
    <ul className="hidden items-center gap-2 md:flex">
      {navigationLinks.map((item) => (
        <li key={item.to}>
          <NavLink to={item.to} className={getLinkClasses}>
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}
