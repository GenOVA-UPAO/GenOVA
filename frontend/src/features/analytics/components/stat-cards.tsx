import { useTranslation } from "react-i18next";

import type { AnalyticsData } from "../lib/types";

interface StatCardsProps {
  data: AnalyticsData;
}

interface Metric {
  label: string;
  value: number;
  hint?: string;
}

function readyMetric(
  data: AnalyticsData,
  t: (key: string, opt?: Record<string, unknown>) => string,
): Metric {
  const ready = Object.hasOwn(data.ova_by_status, "listo") ? data.ova_by_status.listo : 0;
  // Mismo denominador que «OVAs por estado», para que ambos porcentajes cuadren.
  const counted = Object.values(data.ova_by_status).reduce((a, b) => a + b, 0);
  // Sin OVAs, «0 % del total» no aporta nada: el hint solo aparece si hay datos.
  if (counted === 0) return { label: t("stats.readyToUse"), value: ready };
  const share = Math.round((ready / counted) * 100);
  return {
    label: t("stats.readyToUse"),
    value: ready,
    hint: t("stats.shareHint", { share }),
  };
}

function buildMetrics(
  data: AnalyticsData,
  t: (key: string, opt?: Record<string, unknown>) => string,
): Metric[] {
  const people =
    data.scope === "platform"
      ? { label: t("stats.users"), value: data.totals.users ?? 0 }
      : { label: t("stats.linkedStudents"), value: data.totals.students ?? 0 };
  return [{ label: t("stats.totalOvas"), value: data.totals.ovas }, people, readyMetric(data, t)];
}

/** Fila compacta de métricas: en móvil sigue siendo una fila, no tarjetas apiladas. */
export function StatCards({ data }: Readonly<StatCardsProps>) {
  const { t, i18n } = useTranslation("analytics");
  const locale = i18n.language === "en" ? "en-US" : "es-PE";
  return (
    <dl className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card">
      {buildMetrics(data, t).map((metric) => (
        <div key={metric.label} className="flex min-w-0 flex-col gap-1 px-3 py-4 sm:px-6 sm:py-5">
          <dt className="text-xs text-muted-foreground sm:text-sm">{metric.label}</dt>
          <dd className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {metric.value.toLocaleString(locale)}
          </dd>
          {metric.hint !== undefined && (
            <dd className="text-xs text-muted-foreground tabular-nums">{metric.hint}</dd>
          )}
        </div>
      ))}
    </dl>
  );
}
