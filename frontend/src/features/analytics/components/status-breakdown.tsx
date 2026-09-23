import { AnalyticsPanel } from "./analytics-panel";

interface StatusBreakdownProps {
  byStatus: Record<string, number>;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  listo: { label: "Listos", color: "bg-success" },
  generando: { label: "Generando", color: "bg-primary" },
  borrador: { label: "Borradores", color: "bg-muted-foreground/50" },
  error: { label: "Con error", color: "bg-destructive" },
};

export function StatusBreakdown({ byStatus }: Readonly<StatusBreakdownProps>) {
  const sum = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const total = sum > 0 ? sum : 1;

  const statusEntries = Object.entries(STATUS_META).map(([key, meta]) => {
    const n = byStatus[key] ?? 0;
    const pct = Math.round((n / total) * 100);
    return { key, meta, n, pct };
  });

  return (
    <AnalyticsPanel title="OVAs por estado">
      <ul className="space-y-3.5">
        {statusEntries.map((item) => (
          <li key={item.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span>{item.meta.label}</span>
              <span className="tabular-nums">
                <span className="font-medium">{item.n}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">{item.pct} %</span>
              </span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={item.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${item.meta.label}: ${item.pct.toString()} %`}
            >
              <div
                className={`h-full rounded-full ${item.meta.color}`}
                style={{ width: `${item.pct.toString()}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </AnalyticsPanel>
  );
}
