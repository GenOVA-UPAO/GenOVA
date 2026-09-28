const ACTIVITY_SLOTS = ["row-a", "row-b", "row-c", "row-d", "row-e"] as const;

/** Esqueleto CSS del resumen: sin Skeleton/Grid para no añadir chunks al LCP. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-10" role="status" aria-busy="true" aria-label="Cargando resumen">
      <div className="h-[84px] animate-pulse rounded-xl bg-muted sm:h-[118px]" />
      <div
        className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card"
        aria-label="Cargando actividad reciente"
      >
        {ACTIVITY_SLOTS.map((slot) => (
          <div key={slot} className="flex items-center gap-4 px-5 py-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
