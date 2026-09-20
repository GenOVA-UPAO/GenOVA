import { Skeleton } from "@/core/components/ui/skeleton";

/** Esqueleto de las tarjetas de métricas de analítica. */
export function AnalyticsSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      data-testid="analytics-skeleton"
      role="status"
      aria-busy="true"
      aria-label="Cargando métricas"
    >
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-24 rounded-2xl" />
    </div>
  );
}
