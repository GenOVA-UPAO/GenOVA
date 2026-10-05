import { useTranslation } from "react-i18next";

import type { ResourceVM } from "../../lib/ova-job-view-model";

export function RowStateHint({
  status,
  canPreview,
}: Readonly<{ status: ResourceVM["status"]; canPreview: boolean }>) {
  const { t } = useTranslation();
  if (status === "generando") {
    return <span className="shrink-0 text-xs text-primary">{t("workspace:generando_85")}</span>;
  }
  if (status === "pendiente") {
    return <span className="shrink-0 text-xs text-muted-foreground">{t("workspace:en_cola")}</span>;
  }
  if (status === "check" && canPreview) {
    return <span className="shrink-0 text-xs text-primary">{t("workspace:ver")}</span>;
  }
  return null;
}
