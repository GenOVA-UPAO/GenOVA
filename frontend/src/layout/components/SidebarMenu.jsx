import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import {
  Flask, FolderOpen, Gear, House, LinkSimple, PlusSquare,
  ShieldCheck, Trash, Users,
} from '@phosphor-icons/react'
import { navigationLinks } from '../navigation/navLinks.js'
import { isLoggedIn } from '../../lib/auth.js'
import { getCurrentUser } from '../../lib/me.js'
import { fetchTrashCount } from '../../services/ovaHistoryService.js'

const ICONS = { House, FolderOpen, PlusSquare }
const ADMIN_LINKS = [
  { to: '/admin/roles', label: 'Roles', icon: ShieldCheck },
  { to: '/admin/users', label: 'Usuarios', icon: Users },
  { to: '/admin/labs', label: 'Labs', icon: Flask },
]
const CONFIG_LINKS = [
  { to: '/modelos', label: 'Modelos', icon: Gear },
]

function linkClasses({ isActive }) {
  const base = 'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors'
  return isActive
    ? `${base} bg-primary text-primary-foreground shadow-sm`
    : `${base} text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`
}

import { motion } from 'motion/react'

function NavItem({ item, badge, onNavigate }) {
  const Icon = item.icon
  return (
    <motion.li whileHover={{ x: 2 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
      <NavLink to={item.to} className={linkClasses} onClick={onNavigate}>
        <Icon size={18} weight="duotone" className="shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        {badge > 0 ? (
          <motion.span 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
          >
            {badge}
          </motion.span>
        ) : null}
      </NavLink>
    </motion.li>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="px-2 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-1">{children}</ul>
    </div>
  )
}

function initials(user) {
  const name = user?.full_name || user?.email || 'Usuario'
  return name.split(/\s|@/).filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function hasPermission(user, permission) {
  return user?.role === 'administrador' || (user?.permissions || []).includes(permission)
}

export function SidebarMenu({ onNavigate }) {
  const [user, setUser] = useState(null)
  const [trashCount, setTrashCount] = useState(0)
  const location = useLocation()
  const isAdmin = user?.role === 'administrador'
  const principal = navigationLinks.map((item) => ({ ...item, icon: ICONS[item.icon] }))
  const canLink = hasPermission(user, 'users:link') || hasPermission(user, 'users:link:admin')

  useEffect(() => {
    if (!isLoggedIn()) return
    let cancelled = false
    getCurrentUser().then((current) => {
      if (!cancelled) setUser(current)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    fetchTrashCount().then((data) => setTrashCount(data.count || 0)).catch(() => {})
  }, [location.pathname])

  return (
    <>
      <nav aria-label="Navegacion principal" className="flex-1 overflow-y-auto px-2 pb-3">
        <Section title="Principal">
          {principal.map((item) => <NavItem key={item.to} item={item} onNavigate={onNavigate} />)}
          <NavItem item={{ to: '/papelera', label: 'Papelera', icon: Trash }} badge={trashCount} onNavigate={onNavigate} />
        </Section>
        <Section title="Configuracion">
          {CONFIG_LINKS.map((item) => <NavItem key={item.to} item={item} onNavigate={onNavigate} />)}
          {canLink ? (
            <NavItem item={{ to: '/vinculacion', label: 'Vincular', icon: LinkSimple }} onNavigate={onNavigate} />
          ) : null}
        </Section>
        {isAdmin ? (
          <Section title="Administracion">
            {ADMIN_LINKS.map((item) => <NavItem key={item.to} item={item} onNavigate={onNavigate} />)}
          </Section>
        ) : null}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-2 py-2 transition-colors ${isActive ? 'bg-primary/10 ring-1 ring-primary/20' : 'hover:bg-sidebar-accent'}`
          }
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {initials(user)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-medium">{user?.full_name || 'Usuario GenOVA'}</p>
              <span className="shrink-0 rounded-full bg-accent-brand/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-brand">
                {isAdmin ? 'Admin' : user?.role || 'Usuario'}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">{user?.email || 'sesion activa'}</p>
          </div>
        </NavLink>
      </div>
    </>
  )
}
