import { cn } from "@/core/lib/cn";

interface Props {
  percentage: number;
  label?: string;
  className?: string;
}

/** Barra fina de progreso para la regeneración en curso (solo mientras corre). */
export function ChatProgressBar({
  percentage,
  label = "Progreso de regeneración",
  className,
}: Readonly<Props>) {
  const clamped = Math.min(100, Math.max(0, Math.round(percentage)));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1 flex-1 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full w-full origin-left rounded-full bg-primary transition-transform duration-300 ease-out"
          style={{ transform: `scaleX(${String(clamped / 100)})` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{clamped}%</span>
    </div>
  );
}
