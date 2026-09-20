interface StatusBreakdownProps {
  byStatus: Record<string, number>;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  listo: { label: "Listos", color: "bg-emerald-500" },
  generando: { label: "Generando", color: "bg-amber-500" },
  borrador: { label: "Borradores", color: "bg-slate-400" },
  error: { label: "Con error", color: "bg-red-500" },
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
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold">OVAs por estado</h2>
      <div className="space-y-3">
        {statusEntries.map((item) => (
          <div key={item.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{item.meta.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {item.n} · {item.pct}%
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={item.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${item.meta.label}: ${item.pct.toString()}%`}
            >
              <div
                className={`h-full ${item.meta.color}`}
                style={{ width: `${item.pct.toString()}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
