import { Link } from "react-router";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { useDashboardCounts } from "../hooks/use-dashboard-counts";
import type { OvaListItem } from "../lib/types";
import { DashboardAdminPanel } from "./dashboard-admin-panel";
import { DashboardRecentActivity } from "./dashboard-recent-activity";
import { DashboardStatCard } from "./dashboard-stat-card";

interface DashboardBodyProps {
  ovas: OvaListItem[];
  total: number;
  isAdmin: boolean;
}

/** Contenido del dashboard cuando la lista de OVAs ya cargó. */
export function DashboardBody({ ovas, total, isAdmin }: Readonly<DashboardBodyProps>) {
  const recentOvas = ovas.slice(0, 5);
  const counts = useDashboardCounts();
  const hasActiveJobs = (counts.active ?? 0) > 0 || ovas.some((ova) => ova.status === "generando");

  return (
    <>
      {hasActiveJobs && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 text-foreground">
            <Icon name="clock" size="text-lg" className="shrink-0 text-primary" />
            <span>Tienes generaciones en curso. Puedes seguir trabajando mientras terminan.</span>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/mis-ovas?estado=generando">Ver generaciones</Link>
          </Button>
        </div>
      )}

      <section aria-label="Resumen de tu biblioteca">
        <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card">
          <DashboardStatCard label="OVAs" value={total} hint="Toda tu biblioteca" to="/mis-ovas" />
          <DashboardStatCard
            label="Listos"
            value={counts.ready}
            hint="Preparadas para exportar"
            to="/mis-ovas?estado=listo"
          />
          <DashboardStatCard
            label="En curso"
            value={counts.active}
            hint="Generándose ahora"
            to="/mis-ovas?estado=generando"
          />
        </div>
      </section>

      <section aria-labelledby="actividad-reciente">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="actividad-reciente" className="text-lg font-semibold tracking-tight">
            Actividad reciente
          </h2>
          <Link
            to="/mis-ovas"
            className="group inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary outline-none hover:underline hover:underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Ver todas
            <Icon name="caret-right" size="text-sm" />
          </Link>
        </div>
        <DashboardRecentActivity recentOvas={recentOvas} isAdmin={isAdmin} />
      </section>

      {isAdmin && <DashboardAdminPanel />}
    </>
  );
}
