import { Skeleton } from "@/core/components/ui/skeleton";

const ROWS = ["a", "b", "c"];

/** Esqueleto con la forma de las filas de rol: nombre, descripción y permisos. */
export function RolesSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando roles"
      className="divide-y rounded-xl border border-border bg-card"
    >
      {ROWS.map((key) => (
        <div key={key} className="space-y-2.5 px-5 py-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
