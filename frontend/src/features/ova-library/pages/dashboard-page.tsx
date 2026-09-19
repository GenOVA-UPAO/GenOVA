import { Link } from "react-router";

import { useCurrentUser, useIsAdmin } from "@/core/auth/auth-store";
import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { DashboardAdminPanel } from "../components/dashboard-admin-panel";
import { DashboardHeader } from "../components/dashboard-header";
import { DashboardRecentActivity } from "../components/dashboard-recent-activity";
import { DashboardStatCard } from "../components/dashboard-stat-card";
import { useGeneratingJobs } from "../hooks/use-generating-jobs";
import { useOvaList } from "../hooks/use-ova-library";
import type { OvaListItem } from "../lib/types";

function getDashboardStats(ovas: OvaListItem[], total: number) {
  const readyCount = ovas.filter((o) => o.status === "listo").length;
  const activeCount = ovas.filter((o) => o.status === "generando").length;
  const totalCount = total > 0 ? total : ovas.length;
  return { readyCount, activeCount, totalCount };
}

function getUserFirstName(fullName?: string): string {
  if (!fullName) return "Usuario";
  return fullName.split(" ")[0] ?? "Usuario";
}

/** Página principal de bienvenida y resumen de la biblioteca de OVAs. */
export function DashboardPage() {
  const user = useCurrentUser();
  const isAdmin = useIsAdmin();
  const { data } = useOvaList({ page: 1 });

  const ovas = data?.ovas ?? [];
  const total = data?.total_items ?? 0;
  const recentOvas = ovas.slice(0, 4);

  const { hasActiveJobs } = useGeneratingJobs(ovas);

  const firstName = getUserFirstName(user?.full_name);
  const { readyCount, activeCount, totalCount } = getDashboardStats(ovas, total);

  return (
    <section className="mx-auto max-w-7xl space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <DashboardHeader firstName={firstName} />

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
    </section>
  );
}
