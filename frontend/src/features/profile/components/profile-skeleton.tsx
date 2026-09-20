import { Skeleton } from "@/core/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="Cargando perfil">
      <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
      <Skeleton className="h-[400px] w-full rounded-3xl" />
    </div>
  );
}
