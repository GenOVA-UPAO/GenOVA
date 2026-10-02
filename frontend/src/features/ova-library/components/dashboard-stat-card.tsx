import { Link } from "react-router";

import { cn } from "@/core/lib/cn";

interface DashboardStatCardProps {
  label: string;
  /** `undefined` mientras carga: se reserva el hueco para no mover el layout. */
  value: number | undefined;
  hint: string;
  to: string;
  /** `live` resalta la cifra y muestra un punto vivo mientras haya algo en curso. */
  tone?: "default" | "success" | "live";
}

const VALUE_TONE = {
  default: "text-foreground",
  success: "text-success-strong",
  live: "text-primary",
} as const;

/** Métrica del resumen: número grande, etiqueta y enlace a la biblioteca. */
export function DashboardStatCard({ label, value, hint, to, tone = "default" }: Readonly<DashboardStatCardProps>) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 flex-col gap-1 px-3 py-4 transition-colors outline-none first:rounded-l-xl last:rounded-r-xl hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-6 sm:py-5"
    >
      <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground sm:text-sm">
        {label}
        {tone === "live" && (value ?? 0) > 0 && (
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse"
          />
        )}
      </span>
      {value === undefined ? (
        <span className="my-1 h-7 w-10 animate-pulse rounded-md bg-muted sm:h-9" aria-hidden="true" />
      ) : (
        <span
          className={cn(
            "text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl",
            value === 0 && tone !== "default" ? "text-foreground/60" : VALUE_TONE[tone],
          )}
        >
          {value}
        </span>
      )}
      <span className="hidden text-xs text-muted-foreground group-hover:text-foreground sm:block">
        {hint}
      </span>
    </Link>
  );
}
