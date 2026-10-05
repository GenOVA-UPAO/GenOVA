import { useTranslation } from "react-i18next";

import { OvaStatusBadge } from "@/core/components/ova-status-badge";

import type { OvaJobInfo } from "../../lib/job-types";

interface OvaCardBadgesProps {
  status?: string;
  version: number | null;
  job?: OvaJobInfo;
}

/** Estado, versión y progreso de generación en una sola línea. */
export function OvaCardBadges({ status, version, job }: Readonly<OvaCardBadgesProps>) {
  const { t } = useTranslation();
  const progress = status === "generando" ? job?.progress : null;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <OvaStatusBadge status={status} />
      {progress && (
        <span className="text-xs font-medium text-primary tabular-nums">
          {progress.done} {t("ova-library:de")} {progress.total}{" "}
          {t("ova-library:recursos")}{" "}
        </span>
      )}
      {version !== null && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {t("ova-library:version")} {version}
        </span>
      )}
    </div>
  );
}
