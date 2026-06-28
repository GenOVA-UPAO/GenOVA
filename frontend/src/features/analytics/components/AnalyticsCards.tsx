import {
  ChartBar,
  GraduationCap,
  type Icon,
  Stack,
  Users,
} from '@phosphor-icons/react'
import type { AnalyticsTotals } from '../lib/types'

const STATUS_META: Record<string, { label: string; color: string }> = {
  listo: { label: 'Listos', color: 'bg-emerald-500' },
  generando: { label: 'Generando', color: 'bg-amber-500' },
  borrador: { label: 'Borradores', color: 'bg-slate-400' },
  error: { label: 'Con error', color: 'bg-red-500' },
}

interface StatCardProps {
  icon: Icon
  label: string
  value: string | number
}

export function StatCard({ icon: IconCmp, label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <IconCmp size={20} weight="duotone" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

interface StatCardsProps {
  totals: AnalyticsTotals
  scope?: string
}

export function StatCards({ totals, scope }: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard icon={Stack} label="OVAs totales" value={totals.ovas} />
      {scope === 'platform' ? (
        <StatCard icon={Users} label="Usuarios" value={totals.users ?? 0} />
      ) : (
        <StatCard
          icon={GraduationCap}
          label="Alumnos vinculados"
          value={totals.students ?? 0}
        />
      )}
      <StatCard
        icon={ChartBar}
        label="Alcance"
        value={scope === 'platform' ? 'Global' : 'Cohorte'}
      />
    </div>
  )
}

interface StatusBreakdownProps {
  byStatus: Record<string, number>
}

export function StatusBreakdown({ byStatus }: StatusBreakdownProps) {
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0) || 1
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold">OVAs por estado</h2>
      <div className="space-y-3">
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const n = byStatus[key] || 0
          const pct = Math.round((n / total) * 100)
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  {meta.label}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {n} · {pct}%
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${meta.label}: ${pct}%`}
              >
                <div
                  className={`h-full ${meta.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
