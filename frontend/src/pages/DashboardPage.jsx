import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Shield, Users, FlaskConical } from 'lucide-react'
import { isLoggedIn } from '../lib/auth.js'
import { getCurrentUser } from '../lib/me.js'

const ADMIN_CARDS = [
  {
    to: '/admin/roles',
    icon: Shield,
    title: 'Gestión de Roles',
    desc: 'Define conjuntos de permisos y configuraciones de acceso para los perfiles.',
  },
  {
    to: '/admin/users',
    icon: Users,
    title: 'Gestión de Usuarios',
    desc: 'Administra las cuentas registradas en el sistema y reasigna sus roles activos.',
  },
  {
    to: '/admin/labs',
    icon: FlaskConical,
    title: 'Labs',
    desc: 'Prueba y compara modelos de IA con prompts calibrados.',
  },
]

export function DashboardPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(() => isLoggedIn())

  useEffect(() => {
    if (!isLoggedIn()) return
    let cancelled = false
    getCurrentUser().then((user) => {
      if (cancelled) return
      setIsAdmin(user?.role === 'administrador')
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Bienvenido al panel principal del curso de ML.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Aquí se mostrarán métricas, progreso y accesos rápidos a actividades.
        </p>
      </div>

      {!loading && isAdmin ? (
        <div className="space-y-4 pt-4 border-t border-border">
          <h2 className="text-lg font-bold">Panel de Administración de Sistema</h2>
          <p className="text-xs text-muted-foreground">
            Accesos directos para la gestión de accesos y cuentas:
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ADMIN_CARDS.map(({ to, icon: Icon, title, desc }) => (
              <Link
                key={to}
                to={to}
                className="group block rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary hover:shadow-primary/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10 transition-colors">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-bold group-hover:text-primary transition-colors">{title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default DashboardPage
