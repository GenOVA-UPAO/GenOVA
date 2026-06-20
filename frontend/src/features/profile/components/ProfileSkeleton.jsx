import { Skeleton } from '@/core/components/ui/skeleton'

function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-9 w-full" />
    </div>
  )
}

/** Loading placeholder for the profile page: mirrors the two-card layout so
 * the content doesn't jump when data arrives. */
export function ProfileSkeleton() {
  return (
    <>
      <div className="rounded-xl border border-border bg-background shadow-md p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border">
          <Skeleton className="h-20 w-20 shrink-0 rounded-full" />
          <div className="space-y-2 w-full max-w-48">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        {[0, 1, 2, 3].map((i) => (
          <FieldSkeleton key={i} />
        ))}
      </div>
      <div className="rounded-xl border border-border bg-background shadow-md p-6 sm:p-8 space-y-6">
        <Skeleton className="h-5 w-48" />
        {[0, 1, 2].map((i) => (
          <FieldSkeleton key={i} />
        ))}
      </div>
    </>
  )
}
