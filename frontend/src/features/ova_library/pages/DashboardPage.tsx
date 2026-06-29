import { CaretRight, Clock, FolderOpen, Plus } from '@phosphor-icons/react'
import { m as motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/core/components/ui/button'
import {
  ADMIN_CARDS,
  containerVariants,
  formatDate,
  itemVariants,
  STATUS_STYLE,
} from '@/features/ova_library/pages/DashboardPage.helpers'
import { StatCard } from '@/features/ova_library/pages/DashboardStatCard'
import { getCurrentUser } from '@/core/lib/auth/me'
import { fetchOvas } from '@/features/ova_library/services/ovaHistoryService'

interface UserData {
  role?: string
  full_name?: string
}

interface OvaData {
  id: string
  title?: string
  status?: string
  created_at?: string
  updated_at?: string
  owner?: { full_name?: string }
}


export function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [ovas, setOvas] = useState<OvaData[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let cancelled = false
    // TODO BU-002: migrar a useCurrentUser() para consolidar el patrón
    // duplicado de useState(getCachedUser()) + useEffect(getCurrentUser()).
    getCurrentUser().then((current) => {
      if (!cancelled) setUser(current as UserData)
    })
    fetchOvas({ page: 1, limit: 6 })
      .then((data) => {
        if (cancelled) return
        const items =
          (data as { items?: OvaData[]; ovas?: OvaData[] }).items ||
          (data as { items?: OvaData[]; ovas?: OvaData[] }).ovas ||
          []
        setOvas(items)
        setTotal(
          (data as { total?: number; total_items?: number }).total ||
            (data as { total?: number; total_items?: number }).total_items ||
            0,
        )
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
      [
        'OVAs Creadas',
        total || ovas.length,
        'Total en tu biblioteca',
        'text-primary',
      ] as const,
      [
        'En Progreso',
        active,
        'Generaciones activas',
        'text-accent-brand',
      ] as const,
      [
        'Listas',
        ready,
        'Preparadas para exportar',
        'text-emerald-600 dark:text-emerald-400',
      ] as const,
    ]
  }, [ovas, total])
  const isAdmin = user?.role === 'administrador'
  const name = user?.full_name?.split(' ')[0] || 'Usuario'

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-5xl space-y-10"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-accent-brand">
            UPAO - GenOVA ML
          </p>
          <h1 className="font-display text-4xl font-semibold text-foreground">
            Bienvenido, {name}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock size={16} /> Tu espacio para crear y gestionar OVAs con IA.
          </p>
        </div>
        <Button
          asChild
          className="self-start gap-2 shadow-lg shadow-primary/25 rounded-xl px-5 h-11 sm:self-auto transition-transform active:scale-95"
        >
          <Link to="/crear-ova">
            <Plus size={18} weight="bold" /> Crear OVA
          </Link>
        </Button>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-3">
        {stats.map(([label, value, sub, tone]) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            sub={sub}
            tone={tone}
          />
        ))}
      </div>

      <motion.div variants={itemVariants}>
        <div className="mb-5 flex items-center justify-between px-1">
          <h2 className="font-display text-xl font-semibold">
            Actividad reciente
          </h2>
          <Link
            to="/mis-ovas"
            className="group flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Ver todas{' '}
            <CaretRight
              size={14}
              className="transition-transform group-hover:translate-x-1"
              weight="bold"
            />
          </Link>
        </div>
        <div className="space-y-3">
          {ovas.length > 0 ? (
            ovas.slice(0, 4).map((ova) => (
              <motion.div
                key={ova.id}
                whileHover={{ scale: 1.01 }}
                className="group flex items-center gap-4 rounded-2xl glass-card px-5 py-4 transition hover:border-primary/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FolderOpen size={20} weight="duotone" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground group-hover:text-primary transition-colors">
                    {ova.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDate(ova.created_at || ova.updated_at)}
                    {isAdmin && ova.owner && (
                      <span className="ml-2 text-accent-brand">
                        · {ova.owner.full_name}
                      </span>
                    )}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-bold ${STATUS_STYLE[ova.status ?? ''] || 'bg-muted text-muted-foreground'}`}
                >
                  {ova.status || 'borrador'}
                </span>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="hidden sm:flex hover:bg-primary/10 hover:text-primary"
                >
                  <Link to={`/ova/${ova.id}/workspace`}>Editar</Link>
                </Button>
              </motion.div>
            ))
          ) : (
            <motion.div
              whileHover={{ y: -2 }}
              className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-10 text-center transition-colors hover:border-primary/40 hover:bg-primary/10"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary mb-4">
                <Plus size={32} weight="duotone" />
              </div>
              <p className="font-display text-2xl font-semibold text-primary">
                Crea tu primer OVA
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground font-medium">
                Describe un tema y la inteligencia artificial generará todo el
                contenido educativo de acuerdo a la metodología 5E.
              </p>
              <Button
                asChild
                className="mt-6 rounded-xl shadow-lg shadow-primary/20"
              >
                <Link to="/crear-ova">Comenzar ahora</Link>
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {isAdmin && (
        <motion.div
          variants={itemVariants}
          className="rounded-2xl glass-card p-6"
        >
          <h2 className="font-display text-xl font-semibold px-1">
            Panel de administración
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {ADMIN_CARDS.map(({ to, icon: Icon, title, desc }) => (
              <Link
                key={to}
                to={to}
                className="group rounded-xl border border-border/50 bg-background/50 p-5 transition hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
              >
                <div className="mb-4 inline-flex rounded-lg bg-muted p-2.5 text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon size={20} weight="duotone" />
                </div>
                <p className="text-sm font-bold text-foreground">{title}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
                  {desc}
                </p>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </motion.section>
  )
}
