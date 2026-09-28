import { Link } from "react-router";

interface DashboardStatCardProps {
  label: string;
  /** `undefined` mientras carga: se reserva el hueco para no mover el layout. */
  value: number | undefined;
  hint: string;
  to: string;
}

/** Métrica del resumen: número grande, etiqueta y enlace a la biblioteca. */
export function DashboardStatCard({ label, value, hint, to }: Readonly<DashboardStatCardProps>) {
  return (
    <Link
      to={to}
      className="group flex min-w-0 flex-col gap-1 px-3 py-4 transition-colors outline-none first:rounded-l-xl last:rounded-r-xl hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-6 sm:py-5"
    >
      <span className="truncate text-xs text-muted-foreground sm:text-sm">{label}</span>
      {value === undefined ? (
        <span className="my-1 h-7 w-10 animate-pulse rounded-md bg-muted sm:h-9" aria-hidden="true" />
      ) : (
        <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums sm:text-4xl">
          {value}
        </span>
      )}
      <span className="hidden text-xs text-muted-foreground group-hover:text-foreground sm:block">
        {hint}
      </span>
    </Link>
  );
}
