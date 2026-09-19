import { cn } from "@/core/lib/cn";
import { ovaStatusLabel } from "@/core/lib/ova-status";

const STATUS_CLASS: Partial<Record<string, string>> = {
  generando: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  listo: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};
const DEFAULT_CLASS = "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";

interface OvaStatusBadgeProps {
  status?: string | null;
  className?: string;
}

export function OvaStatusBadge({ status, className }: Readonly<OvaStatusBadgeProps>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        STATUS_CLASS[status ?? ""] ?? DEFAULT_CLASS,
        className,
      )}
    >
      {ovaStatusLabel(status)}
    </span>
  );
}
