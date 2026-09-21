const STAT_SLOTS = ["stat-a", "stat-b", "stat-c"] as const;
const ACTIVITY_SLOTS = ["row-a", "row-b", "row-c", "row-d"] as const;

/** Esqueleto CSS del resumen: sin Skeleton/Grid para no añadir chunks al LCP. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-10" role="status" aria-busy="true" aria-label="Cargando resumen">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {STAT_SLOTS.map((slot) => (
          <div key={slot} className="h-32 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="space-y-4" aria-label="Cargando actividad reciente">
        {ACTIVITY_SLOTS.map((slot) => (
          <div key={slot} className="h-20 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
