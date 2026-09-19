import { useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { PageHeader } from "@/core/components/page-header";

import { RecentOvas } from "../components/recent-ovas";
import { StatCards } from "../components/stat-cards";
import { StatusBreakdown } from "../components/status-breakdown";
import { TopCreators } from "../components/top-creators";
import { isForbiddenError, useAnalytics } from "../hooks/use-analytics";

export function AnalyticsPage() {
  const navigate = useNavigate();
  const { data, error, isLoading } = useAnalytics();
  const isForbidden = isForbiddenError(error);

  useEffect(() => {
    if (isForbidden) {
      toast.error("No tienes acceso a Analítica.");
      void navigate("/dashboard", { replace: true });
    }
  }, [isForbidden, navigate]);

  if (isForbidden) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in duration-300">
        <PageHeader title="Analítica de aprendizaje" subtitle="Cargando métricas…" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" data-testid="analytics-skeleton">
          <div className="h-24 animate-pulse rounded-2xl bg-muted/50" />
          <div className="h-24 animate-pulse rounded-2xl bg-muted/50" />
          <div className="h-24 animate-pulse rounded-2xl bg-muted/50" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in duration-300">
        <PageHeader title="Analítica de aprendizaje" />
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive"
        >
          No se pudieron cargar las analíticas. Intenta de nuevo más tarde.
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const scopeLabel =
    data.scope === "platform" ? "toda la plataforma" : "tus alumnos vinculados";

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in duration-300">
      <PageHeader
        title="Analítica de aprendizaje"
        subtitle={`Métricas de ${scopeLabel}.`}
      />

      <div className="space-y-6">
        <StatCards totals={data.totals} scope={data.scope} />
        <div className="grid gap-6 md:grid-cols-2">
          <StatusBreakdown byStatus={data.ova_by_status} />
          <TopCreators creators={data.top_creators} />
        </div>
        <RecentOvas ovas={data.recent_ovas} />
      </div>
    </div>
  );
}
