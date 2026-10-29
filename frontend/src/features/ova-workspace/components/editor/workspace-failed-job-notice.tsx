import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { useOvaLatestJob } from "../../hooks/use-ova-latest-job";
import type { JobSnapshot } from "../../lib/ova-job-view-model";

const DISMISS_KEY = "genova:failed-job-notice-dismissed";

/** Recursos del último job que terminaron sin contenido válido. */
function failedResources(job: JobSnapshot | undefined): number {
  if (job?.status !== "done") return 0;
  return (job.resources ?? []).filter((r) => r.status === "error" || r.status === "degraded")
    .length;
}

function wasDismissed(jobId: string): boolean {
  try {
    return localStorage.getItem(`${DISMISS_KEY}:${jobId}`) === "1";
  } catch {
    return false;
  }
}

function rememberDismissed(jobId: string): void {
  try {
    localStorage.setItem(`${DISMISS_KEY}:${jobId}`, "1");
  } catch {
    // Sin almacenamiento el aviso solo se oculta hasta recargar.
  }
}

/**
 * Aviso no bloqueante: la última generación de este OVA terminó con recursos
 * fallidos. Quien salió de la página de progreso no lo habría visto nunca; el
 * enlace lleva de vuelta a esa página, donde se pueden reintentar.
 */
export function WorkspaceFailedJobNotice({ ovaId }: Readonly<{ ovaId: string }>) {
  const { t } = useTranslation();
  const lookup = useOvaLatestJob(ovaId);
  const jobId = lookup.data?.job_id;
  const [dismissedId, setDismissedId] = useState<string | null>(null);
  const failed = failedResources(lookup.data);
  if (!jobId || failed === 0 || dismissedId === jobId || wasDismissed(jobId)) return null;
  return (
    <div
      role="note"
      className="flex shrink-0 flex-wrap items-start gap-2.5 border-b border-border bg-destructive/5 px-3 py-2.5 text-sm sm:items-center sm:px-4"
    >
      <Icon name="warning" className="mt-0.5 shrink-0 text-destructive sm:mt-0" />
      <p className="min-w-0 flex-1 text-muted-foreground">
        <span className="font-medium text-foreground">
          {failed === 1
            ? t("workspace:1_recurso_no_se_pudo_generar_163")
            : t("workspace:value_recursos_no_se_pudieron_generar_164", { p0: String(failed) })}
        </span>{" "}
        {t("workspace:el_ova_tiene_solo_lo_que_si_se_genero")} </p>
      <div className="flex shrink-0 items-center gap-1">
        <Button asChild variant="outline" size="sm">
          <Link to={`/crear?jobId=${encodeURIComponent(jobId)}`}>{t("workspace:revisar_y_reintentar")}</Link>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("workspace:descartar_aviso")}
          onClick={() => {
            rememberDismissed(jobId);
            setDismissedId(jobId);
          }}
        >
          <Icon name="x" />
        </Button>
      </div>
    </div>
  );
}
