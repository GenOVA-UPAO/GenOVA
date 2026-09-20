import { useEffect } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { PageHeader } from "@/core/components/page-header";
import { QueryErrorState } from "@/core/components/query-error-state";

import { AnalyticsEmpty } from "../components/analytics-empty";
import { AnalyticsSkeleton } from "../components/analytics-skeleton";
import { RecentOvas } from "../components/recent-ovas";
import { StatCards } from "../components/stat-cards";
import { StatusBreakdown } from "../components/status-breakdown";
import { TopCreators } from "../components/top-creators";
import { isForbiddenError, useAnalytics } from "../hooks/use-analytics";

export function AnalyticsPage() {
  const navigate = useNavigate();
  const { data, error, isLoading, refetch } = useAnalytics();
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
        <AnalyticsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in duration-300">
        <PageHeader title="Analítica de aprendizaje" />
        <QueryErrorState
          title="No se pudieron cargar las analíticas"
          onRetry={() => {
            void refetch();
          }}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-in fade-in duration-300">
        <PageHeader title="Analítica de aprendizaje" />
        <AnalyticsEmpty
          onRetry={() => {
            void refetch();
          }}
        />
      </div>
    );
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
