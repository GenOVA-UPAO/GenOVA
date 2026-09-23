import type { AnalyticsData } from "../lib/types";

interface StatCardsProps {
  data: AnalyticsData;
}

interface Metric {
  label: string;
  value: number;
  hint?: string;
}

function readyMetric(data: AnalyticsData): Metric {
  const ready = Object.hasOwn(data.ova_by_status, "listo") ? data.ova_by_status.listo : 0;
  // Mismo denominador que «OVAs por estado», para que ambos porcentajes cuadren.
  const counted = Object.values(data.ova_by_status).reduce((a, b) => a + b, 0);
  const share = counted > 0 ? Math.round((ready / counted) * 100) : 0;
  return { label: "Listos para usar", value: ready, hint: `${String(share)} % del total` };
}

function buildMetrics(data: AnalyticsData): Metric[] {
  const people =
    data.scope === "platform"
      ? { label: "Usuarios", value: data.totals.users ?? 0 }
      : { label: "Alumnos vinculados", value: data.totals.students ?? 0 };
  return [{ label: "OVAs totales", value: data.totals.ovas }, people, readyMetric(data)];
}

/** Fila compacta de métricas: en móvil sigue siendo una fila, no tarjetas apiladas. */
export function StatCards({ data }: Readonly<StatCardsProps>) {
  return (
    <dl className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card">
      {buildMetrics(data).map((metric) => (
        <div key={metric.label} className="flex min-w-0 flex-col gap-1 px-3 py-4 sm:px-6 sm:py-5">
          <dt className="text-xs text-muted-foreground sm:text-sm">{metric.label}</dt>
          <dd className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {metric.value.toLocaleString("es-PE")}
          </dd>
          {metric.hint !== undefined && (
            <dd className="text-xs text-muted-foreground tabular-nums">{metric.hint}</dd>
          )}
        </div>
      ))}
    </dl>
  );
}
