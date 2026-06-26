import { m as motion } from 'motion/react'
import { Navigate } from 'react-router'
import { useAnalytics } from '@/features/analytics/hooks/useAnalytics'
import { StatCards, StatusBreakdown } from '@/features/analytics/components/AnalyticsCards'
import { RecentOvas, TopCreators } from '@/features/analytics/components/AnalyticsLists'

function LoadingState() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/50" />
      ))}
    </div>
  )
}

export function AnalyticsPage() {
  const { data, isLoading, error } = useAnalytics()

  // Sin permiso: el backend devuelve 403 → redirige al dashboard.
  if ((error as { code?: string } | null)?.code === 'forbidden') {
    return <Navigate to="/dashboard" replace />
  }

  const scopeLabel = data?.scope === 'platform' ? 'toda la plataforma' : 'tus alumnos vinculados'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-4xl space-y-6 pb-12"
    >
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold">Analítica de aprendizaje</h1>
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Cargando métricas…' : `Métricas de ${scopeLabel}.`}
        </p>
      </header>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
          No se pudieron cargar las analíticas. Intenta de nuevo más tarde.
        </div>
      ) : data ? (
        <>
          <StatCards totals={data.totals} scope={data.scope} />
          <div className="grid gap-4 md:grid-cols-2">
            <StatusBreakdown byStatus={data.ova_by_status} />
            <TopCreators creators={data.top_creators} />
          </div>
          <RecentOvas ovas={data.recent_ovas} />
        </>
      ) : null}
    </motion.div>
  )
}
