import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Flask, FolderOpen, Plus, ShieldCheck, Users } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '../lib/me.js'
import { fetchOvas } from '../services/ovaHistoryService.js'

const ADMIN_CARDS = [
  { to: '/admin/roles', icon: ShieldCheck, title: 'Roles', desc: 'Permisos y perfiles del sistema.' },
  { to: '/admin/users', icon: Users, title: 'Usuarios', desc: 'Cuentas, estado y rol activo.' },
  { to: '/admin/labs', icon: Flask, title: 'Labs', desc: 'Comparacion de modelos y prompts.' },
]
const STATUS_STYLE = {
  listo: 'bg-emerald-100 text-emerald-700',
  generando: 'bg-blue-100 text-blue-700',
  borrador: 'bg-amber-100 text-amber-700',
  error: 'bg-destructive/10 text-destructive',
}

function formatDate(value) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function StatCard({ label, value, sub, tone }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-2 text-4xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

export function DashboardPage() {
  const [user, setUser] = useState(null)
  const [ovas, setOvas] = useState([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let cancelled = false
    getCurrentUser().then((current) => {
      if (!cancelled) setUser(current)
    })
    fetchOvas({ page: 1, limit: 6 })
      .then((data) => {
        if (cancelled) return
        setOvas(data.items || data.ovas || [])
        setTotal(data.total || data.total_items || 0)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const ready = ovas.filter((ova) => ova.status === 'listo').length
    const active = ovas.filter((ova) => ova.status === 'generando').length
    return [
      ['OVAs Creadas', total || ovas.length, 'Total visible en tu biblioteca', 'text-primary'],
      ['En Progreso', active, 'Generaciones o ediciones activas', 'text-accent-brand'],
      ['Listas', ready, 'Preparadas para editar o exportar', 'text-emerald-600'],
    ]
  }, [ovas, total])
  const isAdmin = user?.role === 'administrador'
  const name = user?.full_name?.split(' ')[0] || 'Usuario'

  return (
    <section className="mx-auto max-w-5xl space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent-brand">
            UPAO - GenOVA ML
          </p>
          <h1 className="font-display text-3xl font-semibold text-foreground">Bienvenido, {name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tu espacio para crear y gestionar OVAs con IA.</p>
        </div>
        <Button asChild className="self-start gap-2 shadow-md sm:self-auto">
          <Link to="/crear-ova"><Plus size={16} weight="bold" /> Crear OVA</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(([label, value, sub, tone]) => <StatCard key={label} label={label} value={value} sub={sub} tone={tone} />)}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">OVAs recientes</h2>
          <Link to="/mis-ovas" className="text-sm font-medium text-primary hover:underline">Ver todas</Link>
        </div>
        <div className="space-y-3">
          {ovas.length > 0 ? (
            ovas.slice(0, 3).map((ova) => (
              <div key={ova.id} className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-shadow hover:shadow-sm">
                <FolderOpen size={20} weight="duotone" className="shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{ova.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(ova.created_at || ova.updated_at)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[ova.status] || 'bg-muted text-muted-foreground'}`}>
                  {ova.status || 'borrador'}
                </span>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/ova/${ova.id}/workspace`}>Editar</Link>
                </Button>
              </div>
            ))
          ) : (
            <div className="rounded-xl border-2 border-dashed border-border bg-card/70 p-8 text-center">
              <p className="font-display text-xl font-semibold">Crea tu primer OVA</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                Describe un tema y genera contenido educativo interactivo en minutos.
              </p>
              <Button asChild className="mt-5">
                <Link to="/crear-ova">Crear nueva OVA</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {isAdmin ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Panel de administracion</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {ADMIN_CARDS.map(({ to, icon: Icon, title, desc }) => (
              <Link key={to} to={to} className="rounded-xl border border-border p-5 transition-all hover:border-primary hover:bg-accent/40">
                <Icon size={22} weight="duotone" className="text-primary" />
                <p className="mt-3 text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
