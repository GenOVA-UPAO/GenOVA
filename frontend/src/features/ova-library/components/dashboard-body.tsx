import { Link } from "react-router";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { OvaListItem } from "../lib/types";
import { getDashboardStats } from "../pages/dashboard-page.helpers";
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
  const recentOvas = ovas.slice(0, 4);
  const hasActiveJobs = ovas.some((ova) => ova.status === "generando");
  const { readyCount, activeCount, totalCount } = getDashboardStats(ovas, total);

  return (
    <>
      {hasActiveJobs && (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between dark:text-blue-200">
          <div className="flex items-center gap-2">
            <Icon name="clock" size="text-lg" className="text-blue-600 dark:text-blue-400" />
            <span>Tienes generaciones en curso o reanudables en tu biblioteca.</span>
          </div>
          <Button asChild size="sm" variant="outline" className="border-blue-500/30">
            <Link to="/mis-ovas">Ver en biblioteca</Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <DashboardStatCard
          label="OVAs Creadas"
          value={totalCount}
          sub="Total en tu biblioteca"
          tone="text-primary"
        />
        <DashboardStatCard
          label="En Progreso"
          value={activeCount}
          sub="Generaciones activas"
          tone="text-accent-brand"
        />
        <DashboardStatCard
          label="Listas"
          value={readyCount}
          sub="Preparadas para exportar"
          tone="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      <div>
        <div className="mb-5 flex items-center justify-between px-1">
          <h2 className="font-display text-xl font-semibold">Actividad reciente</h2>
          <Link
            to="/mis-ovas"
            className="group flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Ver todas
            <Icon
              name="caret-right"
              size="text-sm"
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>
        <DashboardRecentActivity recentOvas={recentOvas} isAdmin={isAdmin} />
      </div>

      {isAdmin && <DashboardAdminPanel />}
    </>
  );
}
