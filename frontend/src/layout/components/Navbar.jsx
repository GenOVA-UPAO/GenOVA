import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router'
import { PaintBrush, List, SignOut, UserCircle, X, Plus } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'framer-motion'
import { NavbarBrand } from './NavbarBrand.jsx'
import { SidebarMenu } from './SidebarMenu.jsx'
import { ThemeModal } from '../../components/ThemeModal.jsx'
import { clearSession } from '../../lib/auth.js'
import { getCurrentUser } from '../../lib/me.js'

function initials(user) {
  const name = user?.full_name || user?.email || 'Usuario'
  return name.split(/\s|@/).filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

export function Navbar() {
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [themeModalOpen, setThemeModalOpen] = useState(false)
  const [user, setUser] = useState(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    getCurrentUser().then((current) => {
      if (!cancelled) setUser(current)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAvatarOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await clearSession()
    navigate('/login')
  }

  return (
    <header className="z-50 border-b border-border bg-card">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="-ml-1 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent md:hidden"
          aria-label="Abrir menu"
        >
          <List size={22} />
        </button>
        <NavbarBrand />
        <div className="flex-1" />
        <Link
          to="/crear-ova"
          className="hidden items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 sm:flex"
        >
          <Plus size={16} weight="bold" /> Crear OVA
        </Link>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setAvatarOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95"
            aria-label="Menu de usuario"
          >
            {initials(user)}
          </button>
          <AnimatePresence>
            {avatarOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-border bg-card py-1 shadow-xl"
              >
                <div className="border-b border-border px-4 py-2.5">
                  <p className="truncate text-sm font-semibold">{user?.full_name || 'Usuario GenOVA'}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email || 'sesion activa'}</p>
                </div>
                <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent" onClick={() => setAvatarOpen(false)}>
                  <UserCircle size={16} weight="duotone" /> Mi Perfil
                </Link>
                <button
                  type="button"
                  onClick={() => { setAvatarOpen(false); setThemeModalOpen(true); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-accent"
                >
                  <PaintBrush size={16} weight="duotone" /> Apariencia
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-destructive hover:bg-accent"
                >
                  <SignOut size={16} weight="duotone" /> Cerrar sesion
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {themeModalOpen && (
        <ThemeModal 
          initialTheme={user?.theme_settings} 
          onClose={() => setThemeModalOpen(false)} 
          onSaved={(newTheme) => { setUser({ ...user, theme_settings: newTheme }) }} 
        />
      )}
      {drawerOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-foreground/30 md:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menu"
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-sidebar shadow-xl md:hidden">
            <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
              <NavbarBrand />
              <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent" aria-label="Cerrar menu">
                <X size={20} />
              </button>
            </div>
            <SidebarMenu onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </>
      ) : null}
    </header>
  )
}
