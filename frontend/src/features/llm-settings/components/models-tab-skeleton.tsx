import { Skeleton } from "@/core/components/ui/skeleton";

const TASKS = ["a", "b", "c", "d", "e", "f"];

/** Esqueleto con la forma del maestro-detalle: lista de tareas y panel. */
export function ModelsTabSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando modelos"
      className="grid overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[260px_1fr]"
    >
      <div className="hidden space-y-2 border-r border-border p-2 md:block">
        {TASKS.map((key) => (
          <Skeleton key={key} className="h-12 w-full" />
        ))}
      </div>
      <div className="space-y-4 p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-64 max-w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}
