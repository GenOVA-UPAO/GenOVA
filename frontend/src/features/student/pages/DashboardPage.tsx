/**
 * Dashboard — OVAs propios siempre visibles.
 * Sección "OVAs Compartidos" solo para profesor con alumnos vinculados.
 */
import { FolderOpen, Plus } from '@phosphor-icons/react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/core/components/ui/button'
import { getCachedUser, getCurrentUser } from '@/core/lib/auth/me'
import { fetchOvas } from '@/features/ova_library/services/ovaHistoryService'
import { fetchMyLinks } from '@/features/profile/services/userLinksService'

interface OvaItem {
  id: string
  title?: string
  status?: string
  created_at?: string
}
interface LinkItem {
  status: string
  linked?: { full_name?: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  listo: 'Listo',
  generando: 'Generando',
  borrador: 'Borrador',
  error: 'Error',
}
const STATUS_CLS: Record<string, string> = {
  listo: 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/20',
  generando: 'bg-blue-500/15 text-blue-700 border border-blue-500/20',
  borrador: 'bg-amber-500/15 text-amber-700 border border-amber-500/20',
  error: 'bg-destructive/15 text-destructive border border-destructive/20',
}

function fmtDate(v?: string) {
  if (!v) return ''
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v))
}

export function DashboardPage() {
  const [role, setRole]           = useState<string | null>(() => getCachedUser()?.role ?? null)
  const [name, setName]           = useState<string>('')
  const [ovas, setOvas]           = useState<OvaItem[]>([])
  const [links, setLinks]         = useState<LinkItem[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getCurrentUser(),
      fetchOvas({ page: 1, limit: 5 }),
      fetchMyLinks(),
    ])
      .then(([user, ovaData, linksRes]) => {
        if (cancelled) return
        setRole((user?.role as string) ?? null)
        setName((user as { full_name?: string })?.full_name?.split(' ')[0] ?? 'Usuario')
        const items =
          (ovaData as { items?: OvaItem[] }).items ??
          (ovaData as { ovas?: OvaItem[] }).ovas ?? []
        setOvas(items)
        setLinks(
          (linksRes.links ?? []).filter(
            (l) => l.status === 'active' || l.status === 'accepted',
          ) as LinkItem[],
        )
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const showSharedSection = role === 'profesor' && links.length > 0

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted-foreground">
        Cargando…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bienvenido, {name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tu espacio para crear y gestionar OVAs con IA.
          </p>
        </div>
        <Button asChild className="self-start sm:self-auto">
          <Link to="/crear-ova"><Plus size={16} weight="bold" className="mr-1.5" />Crear OVA</Link>
        </Button>
      </div>

      {/* OVAs propios — visibles para todos */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mis OVAs recientes</h2>
          <Link
            to="/mis-ovas"
            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Ver todas →
          </Link>
        </div>

        {ovas.length > 0 ? (
          <div className="space-y-3">
            {ovas.map((ova) => (
              <div
                key={ova.id}
                className="flex items-center gap-4 rounded-2xl border bg-card px-5 py-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FolderOpen size={20} weight="duotone" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{ova.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{fmtDate(ova.created_at)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-bold ${STATUS_CLS[ova.status ?? ''] ?? 'bg-muted text-muted-foreground'}`}>
                  {STATUS_LABEL[ova.status ?? ''] ?? 'Borrador'}
                </span>
                <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
                  <Link to={`/ova/${ova.id}/workspace`}>Editar</Link>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 p-10 text-center space-y-3">
            <p className="font-semibold text-primary">Crea tu primer OVA</p>
            <p className="text-sm text-muted-foreground">
              Describe un tema y la IA generará todo el contenido educativo.
            </p>
            <Button asChild className="mt-2">
              <Link to="/crear-ova">Comenzar ahora</Link>
            </Button>
          </div>
        )}
      </section>

      {/* OVAs Compartidos — solo profesor con alumnos vinculados */}
      {showSharedSection && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">OVAs Compartidos con mis alumnos</h2>
            <p className="text-sm text-muted-foreground">
              {links.length} alumno{links.length !== 1 ? 's' : ''} vinculado{links.length !== 1 ? 's' : ''}.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {links.map((link, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {link.linked?.full_name?.[0] ?? '?'}
                </span>
                <span className="text-sm font-medium">{link.linked?.full_name ?? 'Alumno vinculado'}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Próximamente: estadísticas de consumo por alumno.
          </div>
        </section>
      )}

      {role === 'profesor' && links.length === 0 && (
        <div className="rounded-xl border bg-muted/30 p-6 text-center space-y-2">
          <p className="text-sm font-medium">Vincula alumnos para compartir tus OVAs</p>
          <Link to="/vinculacion" className="text-xs font-semibold text-primary hover:underline">
            Ir a Vinculación →
          </Link>
        </div>
      )}
    </div>
  )
}
