import type { Creator, RecentOva } from '../lib/types'

const STATUS_BADGE: Record<string, string> = {
  listo: 'bg-emerald-500/15 text-emerald-600',
  generando: 'bg-amber-500/15 text-amber-600',
  borrador: 'bg-slate-400/15 text-slate-500',
  error: 'bg-red-500/15 text-red-600',
}

export function TopCreators({ creators }: { creators: Creator[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold">Mayores creadores</h2>
      {creators.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin datos todavía.</p>
      ) : (
        <ul className="space-y-2">
          {creators.map((c, i) => (
            <li key={c.user_id} className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {c.name || c.email}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.email}
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums">
                {c.ova_count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function fmtDate(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
    })
  } catch {
    return '—'
  }
}

export function RecentOvas({ ovas }: { ovas: RecentOva[] }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold">Actividad reciente</h2>
      {ovas.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin OVAs recientes.</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {ovas.map((o) => (
            <li key={o.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {o.title || 'Sin título'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {o.owner_name}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_BADGE[o.status] || 'bg-muted text-muted-foreground'}`}
              >
                {o.status}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {fmtDate(o.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
