import { Skeleton } from "@/core/components/ui/skeleton";

/** Filas con la forma de las de verdad: estrella, nombre y detalle, precios. */
export function CatalogSkeleton() {
  return (
    <div
      className="flex-1 divide-y divide-border overflow-hidden px-5"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Cargando modelos…</span>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 py-3.5">
          <Skeleton className="size-7 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-80 max-w-full" />
          </div>
          <Skeleton className="hidden h-4 w-40 sm:block" />
        </div>
      ))}
    </div>
  );
}
