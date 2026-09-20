import type { AnalyticsTotals } from "../lib/types";
import { StatCard } from "./stat-card";

interface StatCardsProps {
  totals: AnalyticsTotals;
  scope?: string;
}

export function StatCards({ totals, scope }: Readonly<StatCardsProps>) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard icon="stack" label="OVAs totales" value={totals.ovas} />

      {scope === "platform" ? (
        <StatCard icon="users" label="Usuarios" value={totals.users ?? 0} />
      ) : (
        <StatCard
          icon="graduation-cap"
          label="Alumnos vinculados"
          value={totals.students ?? 0}
        />
      )}

      <StatCard
        icon="chart-bar"
        label="Alcance"
        value={scope === "platform" ? "Global" : "Cohorte"}
      />
    </div>
  );
}
