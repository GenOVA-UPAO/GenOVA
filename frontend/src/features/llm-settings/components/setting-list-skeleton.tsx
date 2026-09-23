import { Skeleton } from "@/core/components/ui/skeleton";

/** Esqueleto de una lista de ajustes con interruptor. */
export function SettingListSkeleton({ rows }: Readonly<{ rows: number }>) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Cargando"
      className="divide-y rounded-xl border border-border bg-card"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-4">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      ))}
    </div>
  );
}
