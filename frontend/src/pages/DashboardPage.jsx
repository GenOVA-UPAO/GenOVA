import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ShieldCheck, Users, Flask } from '@phosphor-icons/react'
import { isLoggedIn } from '../lib/auth.js'
import { getCurrentUser } from '../lib/me.js'

const ADMIN_CARDS = [
  {
    to: '/admin/roles',
    icon: ShieldCheck,
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
    icon: Flask,
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
    <section className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Bienvenido al panel principal del curso de ML.</p>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border border-l-4 border-l-accent-brand bg-card p-6 shadow-sm">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-2 -top-4 select-none font-display text-8xl font-semibold text-foreground/5"
        >
          ML
        </span>
        <p className="text-xs font-bold uppercase tracking-widest text-accent-brand">Tu espacio</p>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Aquí se mostrarán métricas, progreso y accesos rápidos a tus actividades de
          generación de Objetos Virtuales de Aprendizaje.
        </p>
      </div>

      {!loading && isAdmin ? (
        <div className="space-y-4 pt-4 border-t border-border">
          <h2 className="text-xl font-bold">Panel de Administración de Sistema</h2>
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
                    <Icon size={20} weight="duotone" />
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
