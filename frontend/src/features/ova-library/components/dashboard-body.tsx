import i18n from "i18next";
import { useTranslation } from "react-i18next";
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
  useTranslation();
  const recentOvas = ovas.slice(0, 5);
  const counts = useDashboardCounts();
  const hasActiveJobs = (counts.active ?? 0) > 0 || ovas.some((ova) => ova.status === "generando");

  return (
    <>
      {hasActiveJobs && (
        <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 text-foreground">
            <Icon name="clock" size="text-lg" className="shrink-0 text-primary" />
            <span>
              {i18n.t(
                "ova-library:tienes_generaciones_en_curso_puedes_seguir_trabajando_mientras_terminan",
              )}
            </span>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/mis-ovas?estado=generando">{i18n.t("ova-library:ver_generaciones")}</Link>
          </Button>
        </div>
      )}

      <section aria-label={i18n.t("ova-library:resumen_de_tu_biblioteca")}>
        <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card">
          <DashboardStatCard
            label={i18n.t("ova-library:ovas")}
            value={total}
            hint={i18n.t("ova-library:toda_tu_biblioteca")}
            to="/mis-ovas"
          />
          <DashboardStatCard
            label={i18n.t("ova-library:listos")}
            value={counts.ready}
            hint={i18n.t("ova-library:preparados_para_exportar")}
            to="/mis-ovas?estado=listo"
            tone="success"
          />
          <DashboardStatCard
            label={i18n.t("ova-library:en_curso")}
            value={counts.active}
            hint={i18n.t("ova-library:generandose_ahora")}
            to="/mis-ovas?estado=generando"
            tone="live"
          />
        </div>
      </section>

      <section aria-labelledby="actividad-reciente">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h2 id="actividad-reciente" className="text-lg font-semibold tracking-tight">
            {i18n.t("ova-library:actividad_reciente")}{" "}
          </h2>
          <Link
            to="/mis-ovas"
            className="group inline-flex items-center gap-1 rounded-md text-sm font-medium text-primary outline-none hover:underline hover:underline-offset-4 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {i18n.t("ova-library:ver_todas")} <Icon name="caret-right" size="text-sm" />
          </Link>
        </div>
        <DashboardRecentActivity recentOvas={recentOvas} isAdmin={isAdmin} />
      </section>

      {isAdmin && <DashboardAdminPanel />}
    </>
  );
}
