import { cn } from "@/core/lib/cn";
import { ovaStatusLabel } from "@/core/lib/ova-status";

const STATUS_CLASS: Partial<Record<string, string>> = {
  generando: "bg-primary/10 text-primary",
  error: "bg-destructive/10 text-destructive",
  listo: "bg-success/12 text-success-strong",
};
const DEFAULT_CLASS = "bg-muted text-muted-foreground ring-1 ring-border ring-inset";

interface OvaStatusBadgeProps {
  status?: string | null;
  className?: string;
}

export function OvaStatusBadge({ status, className }: Readonly<OvaStatusBadgeProps>) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap",
        STATUS_CLASS[status ?? ""] ?? DEFAULT_CLASS,
        className,
      )}
    >
      {ovaStatusLabel(status)}
    </span>
  );
}
