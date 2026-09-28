import { Skeleton } from "@/core/components/ui/skeleton";

/** Esqueleto con la forma de la lista de la papelera. */
export function PapeleraSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando papelera"
      aria-busy="true"
      className="divide-y divide-border rounded-xl border border-border bg-card"
    >
      <div className="flex h-12 items-center gap-3 px-4">
        <Skeleton className="size-4 rounded-[4px]" />
        <Skeleton className="h-4 w-52" />
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="size-4 rounded-[4px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-9 w-28 rounded-lg sm:block" />
          <Skeleton className="hidden h-9 w-24 rounded-lg sm:block" />
        </div>
      ))}
    </div>
  );
}
