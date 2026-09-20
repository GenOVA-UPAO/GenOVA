import { cn } from "@/core/lib/cn";

interface DashboardStatCardProps {
  label: string;
  value: number;
  sub: string;
  tone: string;
}

/** Tarjeta individual de métrica en el dashboard principal. */
export function DashboardStatCard({
  label,
  value,
  sub,
  tone,
}: Readonly<DashboardStatCardProps>) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/50 p-6 shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className={cn("mt-2 font-display text-4xl font-bold", tone)}>
        {value}
      </p>
      <p className="mt-2 text-xs font-medium text-muted-foreground">
        {sub}
      </p>
    </div>
  );
}
