import { Skeleton } from "@/core/components/ui/skeleton";

/** Esqueleto con la forma del workspace: cabecera, chat y visor. */
export function WorkspaceSkeleton() {
  return (
    <div role="status" aria-label="Cargando OVA" className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-6 w-72 max-w-[50%]" />
        <Skeleton className="ml-auto h-9 w-40" />
      </div>
      <div className="grid min-h-0 flex-1 md:grid-cols-[35%_1fr]">
        <div className="space-y-4 border-r border-border p-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="ml-auto h-12 w-3/4" />
          <Skeleton className="h-16 w-5/6" />
          <Skeleton className="mt-auto h-28 w-full" />
        </div>
        <div className="hidden space-y-3 p-4 md:block">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-[60vh] w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Cargando OVA…</span>
    </div>
  );
}
