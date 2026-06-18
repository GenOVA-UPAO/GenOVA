import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Flask, FolderOpen, Plus, ShieldCheck, Users, Clock, CaretRight } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '../lib/me.js'
import { fetchOvas } from '../services/ovaHistoryService.js'

const ADMIN_CARDS = [
  { to: '/admin/roles', icon: ShieldCheck, title: 'Roles', desc: 'Permisos y perfiles del sistema.' },
  { to: '/admin/users', icon: Users, title: 'Usuarios', desc: 'Cuentas, estado y rol activo.' },
  { to: '/admin/labs', icon: Flask, title: 'Labs', desc: 'Comparacion de modelos y prompts.' },
]

const STATUS_STYLE = {
  listo: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
  generando: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/20',
  borrador: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20',
  error: 'bg-destructive/15 text-destructive border border-destructive/20',
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

function formatDate(value) {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function StatCard({ label, value, sub, tone }) {
  return (
    <motion.div variants={itemVariants} whileHover={{ y: -4 }} className="glass-card rounded-2xl p-6 transition-all">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-3 text-5xl font-display font-semibold tracking-tight ${tone}`}>{value}</p>
      <p className="mt-2 text-xs font-medium text-muted-foreground">{sub}</p>
    </motion.div>
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
      ['OVAs Creadas', total || ovas.length, 'Total en tu biblioteca', 'text-primary'],
      ['En Progreso', active, 'Generaciones activas', 'text-accent-brand'],
      ['Listas', ready, 'Preparadas para exportar', 'text-emerald-600 dark:text-emerald-400'],
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
      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-accent-brand">
            UPAO - GenOVA ML
          </p>
          <h1 className="font-display text-4xl font-semibold text-foreground">Bienvenido, {name}</h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock size={16} /> Tu espacio para crear y gestionar OVAs con IA.
          </p>
        </div>
        <Button asChild className="self-start gap-2 shadow-lg shadow-primary/25 rounded-xl px-5 h-11 sm:self-auto transition-transform active:scale-95">
          <Link to="/crear-ova"><Plus size={18} weight="bold" /> Crear OVA</Link>
        </Button>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-3">
        {stats.map(([label, value, sub, tone]) => <StatCard key={label} label={label} value={value} sub={sub} tone={tone} />)}
      </div>

      <motion.div variants={itemVariants}>
        <div className="mb-5 flex items-center justify-between px-1">
          <h2 className="font-display text-xl font-semibold">Actividad reciente</h2>
          <Link to="/mis-ovas" className="group flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
            Ver todas <CaretRight size={14} className="transition-transform group-hover:translate-x-1" weight="bold" />
          </Link>
        </div>
        <div className="space-y-3">
          {ovas.length > 0 ? (
            ovas.slice(0, 4).map((ova) => (
              <motion.div key={ova.id} whileHover={{ scale: 1.01 }} className="group flex items-center gap-4 rounded-2xl glass-card px-5 py-4 transition-all hover:border-primary/30">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FolderOpen size={20} weight="duotone" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground group-hover:text-primary transition-colors">{ova.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(ova.created_at || ova.updated_at)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-bold ${STATUS_STYLE[ova.status] || 'bg-muted text-muted-foreground'}`}>
                  {ova.status || 'borrador'}
                </span>
                <Button asChild variant="ghost" size="sm" className="hidden sm:flex hover:bg-primary/10 hover:text-primary">
                  <Link to={`/ova/${ova.id}/workspace`}>Editar</Link>
                </Button>
              </motion.div>
            ))
          ) : (
            <motion.div whileHover={{ y: -2 }} className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-10 text-center transition-colors hover:border-primary/40 hover:bg-primary/10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary mb-4">
                <Plus size={32} weight="duotone" />
              </div>
              <p className="font-display text-2xl font-semibold text-primary">Crea tu primer OVA</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground font-medium">
                Describe un tema y la inteligencia artificial generará todo el contenido educativo de acuerdo a la metodología 5E.
              </p>
              <Button asChild className="mt-6 rounded-xl shadow-lg shadow-primary/20">
                <Link to="/crear-ova">Comenzar ahora</Link>
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {isAdmin && (
        <motion.div variants={itemVariants} className="rounded-2xl glass-card p-6">
          <h2 className="font-display text-xl font-semibold px-1">Panel de administración</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {ADMIN_CARDS.map(({ to, icon: Icon, title, desc }) => (
              <Link key={to} to={to} className="group rounded-xl border border-border/50 bg-background/50 p-5 transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-md">
                <div className="mb-4 inline-flex rounded-lg bg-muted p-2.5 text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon size={20} weight="duotone" />
                </div>
                <p className="text-sm font-bold text-foreground">{title}</p>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{desc}</p>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </motion.section>
  )
}
