import { Skeleton } from "@/core/components/ui/skeleton";

/** Esqueleto de filas de la tabla de usuarios. */
export function UsersSkeleton() {
  return (
    <div className="space-y-3 p-6" role="status" aria-busy="true" aria-label="Cargando usuarios">
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  );
}
