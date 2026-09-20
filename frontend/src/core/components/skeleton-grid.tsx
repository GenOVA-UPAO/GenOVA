import { Skeleton } from "@/core/components/ui/skeleton";
import { cn } from "@/core/lib/cn";

interface SkeletonGridProps {
  count?: number;
  /** Clases del grid; por defecto 1/2/3 columnas como las tarjetas de OVA. */
  className?: string;
  itemClassName?: string;
  label?: string;
}

export function SkeletonGrid({
  count = 6,
  className,
  itemClassName,
  label = "Cargando",
}: Readonly<SkeletonGridProps>) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={cn("h-48 rounded-2xl", itemClassName)} />
      ))}
    </div>
  );
}
