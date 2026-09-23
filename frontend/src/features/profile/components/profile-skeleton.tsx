import { Skeleton } from "@/core/components/ui/skeleton";

/** Esqueleto con la forma final: pestañas y panel de datos personales. */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-busy="true" aria-label="Cargando perfil">
      <Skeleton className="h-11 w-full rounded-none" />
      <div className="max-w-3xl space-y-5 rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}
