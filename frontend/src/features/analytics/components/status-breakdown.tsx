import { useTranslation } from "react-i18next";

import { AnalyticsPanel } from "./analytics-panel";

interface StatusBreakdownProps {
  byStatus: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  listo: "bg-success",
  generando: "bg-primary",
  borrador: "bg-muted-foreground/50",
  error: "bg-destructive",
};

export function StatusBreakdown({ byStatus }: Readonly<StatusBreakdownProps>) {
  const { t } = useTranslation("analytics");
  const sum = Object.values(byStatus).reduce((a, b) => a + b, 0);
  const total = sum > 0 ? sum : 1;

  const statusEntries = Object.entries(STATUS_COLORS).map(([key, color]) => {
    const n = byStatus[key] ?? 0;
    const pct = Math.round((n / total) * 100);
    const label = t(`breakdown.statuses.${key}`);
    return { key, label, color, n, pct };
  });

  // Sin OVAs, cuatro barras vacías al 0 % no dicen nada: basta una frase.
  if (sum === 0) {
    return (
      <AnalyticsPanel title={t("breakdown.title")}>
        <p className="text-sm text-muted-foreground">
          {t("breakdown.empty")}
        </p>
      </AnalyticsPanel>
    );
  }

  return (
    <AnalyticsPanel title={t("breakdown.title")}>
      <ul className="space-y-3.5">
        {statusEntries.map((item) => (
          <li key={item.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
              <span>{item.label}</span>
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
              aria-label={t("breakdown.ariaLabel", { status: item.label, pct: item.pct })}
            >
              <div
                className={`h-full rounded-full ${item.color}`}
                style={{ width: `${item.pct.toString()}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </AnalyticsPanel>
  );
}
