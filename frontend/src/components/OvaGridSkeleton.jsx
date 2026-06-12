import { Skeleton } from '@/components/ui/skeleton'

/** Card-shaped placeholders matching the Mis OVAs grid, so pagination and
 * filter changes don't flash an empty layout. */
export function OvaGridSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-border bg-background p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
          </div>
        </div>
      ))}
    </div>
  )
}
