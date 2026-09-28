import { Skeleton } from "@/core/components/ui/skeleton";

const ROWS = ["a", "b", "c", "d", "e", "f"];

/** Esqueleto con la forma de las filas: avatar, nombre y email, rol y estado. */
export function UsersSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Cargando usuarios" className="divide-y">
      {ROWS.map((key) => (
        <div key={key} className="flex items-center gap-3 px-4 py-3.5">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40 max-w-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="hidden h-4 w-28 md:block" />
          <Skeleton className="hidden h-4 w-16 md:block" />
        </div>
      ))}
    </div>
  );
}
