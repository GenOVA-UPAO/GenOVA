import { cn } from "@/core/lib/cn";

interface Props {
  percentage: number;
  label?: string;
  className?: string;
}

export function ChatProgressBar({
  percentage,
  label = "Progreso de regeneración",
  className,
}: Readonly<Props>) {
  const clamped = Math.min(100, Math.max(0, Math.round(percentage)));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("space-y-1", className)}
    >
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Progreso</span>
        <span className="font-mono font-medium">{String(clamped)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${String(clamped)}%` }}
        />
      </div>
    </div>
  );
}
