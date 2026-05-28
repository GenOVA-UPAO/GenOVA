import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { isLoggedIn } from '../lib/auth.js'
import { apiFetch } from '../lib/http.js'

export function DashboardPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(() => isLoggedIn())

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
        /* rol no disponible: el usuario queda sin permisos de admin */
      } finally {
        setLoading(false)
      }
    }

    checkRole()
  }, [])

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Bienvenido al panel principal del curso de ML.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-700">
          Aquí se mostrarán métricas, progreso y accesos rápidos a actividades.
        </p>
      </div>

      {!loading && isAdmin && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Panel de Administración de Sistema</h2>
          <p className="text-xs text-slate-500">Accesos directos para la gestión de accesos y cuentas:</p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/admin/roles"
              className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-md hover:border-indigo-500 hover:shadow-indigo-500/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-xl text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                  🛡️
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Gestión de Roles
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Define conjuntos de permisos y configuraciones de acceso para los perfiles.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/users"
              className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-md hover:border-indigo-500 hover:shadow-indigo-500/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-xl text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                  👥
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Gestión de Usuarios
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Administra las cuentas registradas en el sistema y reasigna sus roles activos.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/labs"
              className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-md hover:border-indigo-500 hover:shadow-indigo-500/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-xl text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                  🧪
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Labs
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Prueba y compara modelos de IA con prompts calibrados.
                  </p>
                </div>
              </div>
            </Link>
          </div>

        </div>
      )}
    </section>
  )
}
export default DashboardPage
