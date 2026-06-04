import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router'
import { clearSession, isLoggedIn } from '../lib/auth.js'
import { apiFetch } from '../lib/http.js'

export function AdminLayout() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(() => isLoggedIn())
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!isLoggedIn()) return

    const checkAdmin = async () => {
      try {
        const response = await apiFetch('/api/auth/me')
        if (response.status === 200) {
          const user = await response.json()
          setIsAdmin(user.role === 'administrador')
        } else {
          setIsAdmin(false)
        }
      } catch {
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [])

  const handleLogout = async () => {
    await clearSession()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"></div>
          <p className="text-sm font-medium text-slate-400 animate-pulse">Verificando credenciales de administrador...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  const getLinkClasses = ({ isActive }) => {
    if (isActive) {
      return 'flex items-center gap-3 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all'
    }
    return 'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all'
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 antialiased">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900 p-5 md:flex md:flex-col justify-between">
        <div>
          {/* Logo / Brand */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-indigo-500"></span>
                GENOVA
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mt-0.5">
                Panel Admin
              </span>
            </div>
          </div>

          <p className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Administración
          </p>

          <nav className="space-y-1">
            <NavLink to="/admin/roles" className={getLinkClasses}>
              <span>Roles</span>
            </NavLink>
            <NavLink to="/admin/users" className={getLinkClasses}>
              <span>Usuarios</span>
            </NavLink>
            <NavLink to="/profile" className={getLinkClasses}>
              <span>Mi Perfil</span>
            </NavLink>
          </nav>
        </div>

        <div>
          <div className="border-t border-slate-800 pt-4 space-y-2">
            <NavLink
              to="/dashboard"
              className="flex items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all"
            >
              <span>Volver a la App</span>
            </NavLink>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-sm font-medium text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-all text-left"
            >
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/50 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-slate-400">
              Bienvenido, Administrador
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              Sistema Activo
            </span>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
