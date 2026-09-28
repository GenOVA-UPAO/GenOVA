import { Skeleton } from "@/core/components/ui/skeleton";

import { OVA_GRID_CLASS } from "../../lib/ova-grid";

interface OvaCardSkeletonGridProps {
  count?: number;
}

/** Esqueleto con la forma de la rejilla de tarjetas de OVA. */
export function OvaCardSkeletonGrid({ count = 6 }: Readonly<OvaCardSkeletonGridProps>) {
  return (
    <div role="status" aria-label="Cargando OVAs" aria-busy="true" className="space-y-3">
      <div className="flex h-12 items-center gap-3 px-4">
        <Skeleton className="size-4 rounded-[4px]" />
        <Skeleton className="h-4 w-52" />
        <Skeleton className="ml-auto h-4 w-16" />
      </div>
      <div className={OVA_GRID_CLASS}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex flex-col rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-4 rounded-[4px]" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="ml-auto size-7 rounded-lg" />
            </div>
            <Skeleton className="mt-3 h-4 w-11/12" />
            <Skeleton className="mt-2 h-4 w-2/3" />
            <Skeleton className="mt-3 h-3 w-1/3" />
            <div className="mt-4 flex gap-2 border-t border-border pt-3">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
