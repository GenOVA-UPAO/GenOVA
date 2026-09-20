import { SkeletonGrid } from "@/core/components/skeleton-grid";
import { Skeleton } from "@/core/components/ui/skeleton";

/** Esqueleto del resumen del dashboard (tarjetas + actividad). */
export function DashboardSkeleton() {
  return (
    <div className="space-y-10" role="status" aria-busy="true" aria-label="Cargando resumen">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <SkeletonGrid
        count={4}
        className="sm:grid-cols-1 lg:grid-cols-1"
        itemClassName="h-20"
        label="Cargando actividad reciente"
      />
    </div>
  );
}
