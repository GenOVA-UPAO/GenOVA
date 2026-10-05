import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { PageHeader } from "@/core/components/page-header";
import { QueryErrorState } from "@/core/components/query-error-state";

import { AnalyticsEmpty } from "../components/analytics-empty";
import { AnalyticsSkeleton } from "../components/analytics-skeleton";
import { NoStudentsNote } from "../components/no-students-note";
import { RecentOvas } from "../components/recent-ovas";
import { StatCards } from "../components/stat-cards";
import { StatusBreakdown } from "../components/status-breakdown";
import { TopCreators } from "../components/top-creators";
import { isForbiddenError, useAnalytics } from "../hooks/use-analytics";

export function AnalyticsPage() {
  const { t } = useTranslation("analytics");
  const navigate = useNavigate();
  const { data, error, isLoading, refetch } = useAnalytics();
  const isForbidden = isForbiddenError(error);
  const pageTitle = t("page.title");

  useEffect(() => {
    if (isForbidden) {
      toast.error(t("page.forbiddenToast"));
      void navigate("/dashboard", { replace: true });
    }
  }, [isForbidden, navigate, t]);

  if (isForbidden) return null;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title={pageTitle} subtitle={t("page.loadingSubtitle")} />
        <AnalyticsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title={pageTitle} />
        <QueryErrorState
          title={t("page.errorTitle")}
          onRetry={() => {
            void refetch();
          }}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader title={pageTitle} />
        <AnalyticsEmpty
          onRetry={() => {
            void refetch();
          }}
        />
      </div>
    );
  }

  const isPlatform = data.scope === "platform";
  const subtitle = isPlatform ? t("page.subtitlePlatform") : t("page.subtitleStudents");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title={pageTitle} subtitle={subtitle} />
      <StatCards data={data} />
      {!isPlatform && (data.totals.students ?? 0) === 0 && <NoStudentsNote />}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <RecentOvas ovas={data.recent_ovas} className="max-lg:order-last" />
        <div className="min-w-0 space-y-6">
          <StatusBreakdown byStatus={data.ova_by_status} />
          <TopCreators creators={data.top_creators} />
        </div>
      </div>
    </div>
  );
}
