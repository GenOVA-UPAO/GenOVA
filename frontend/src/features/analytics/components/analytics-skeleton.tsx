import { Skeleton } from "@/core/components/ui/skeleton";

/** Esqueleto con la forma final: fila de métricas, actividad y columna lateral. */
export function AnalyticsSkeleton() {
  return (
    <div
      className="space-y-6"
      data-testid="analytics-skeleton"
      role="status"
      aria-busy="true"
      aria-label="Cargando métricas"
    >
      <Skeleton className="h-24 rounded-xl sm:h-28" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Skeleton className="h-96 rounded-xl" />
        <div className="space-y-6">
          <Skeleton className="h-52 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
