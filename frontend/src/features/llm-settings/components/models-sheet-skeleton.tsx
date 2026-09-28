import { Skeleton } from "@/core/components/ui/skeleton";

/** Carga de una lista de Perfiles o Historial, con la forma de sus filas. */
export function ModelsSheetSkeleton({ withAction = true }: Readonly<{ withAction?: boolean }>) {
  return (
    <div className="divide-y divide-border" role="status" aria-busy="true" aria-label="Cargando">
      {["a", "b", "c"].map((key) => (
        <div key={key} className="flex items-center gap-3 py-3.5">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          {withAction ? <Skeleton className="h-8 w-20 rounded-lg" /> : null}
        </div>
      ))}
    </div>
  );
}
