import { useTranslation } from "react-i18next";

import { EmptyState } from "@/core/components/empty-state";
import { Button } from "@/core/components/ui/button";

interface AnalyticsEmptyProps {
  onRetry: () => void;
}

/** Vacío cuando la query de analítica no devolvió datos. */
export function AnalyticsEmpty({ onRetry }: Readonly<AnalyticsEmptyProps>) {
  const { t } = useTranslation("analytics");
  return (
    <EmptyState
      icon="magnifying-glass-minus"
      title={t("empty.title")}
      description={t("empty.description")}
      action={
        <Button variant="outline" onClick={onRetry}>
          {t("empty.retry")}
        </Button>
      }
    />
  );
}
