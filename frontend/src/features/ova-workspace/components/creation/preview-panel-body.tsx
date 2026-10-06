import { useTranslation } from "react-i18next";

import { HtmlPreviewFrame } from "@/core/components/html-preview-frame";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";

import type { ResourceVM } from "../../lib/ova-job-view-model";

interface Props {
  active: ResourceVM | undefined;
  loading: boolean;
  html: string;
  /** La carga del contenido falló: sin esto el panel quedaba en blanco sin explicación. */
  error?: boolean;
  failed?: boolean;
  onRetry?: () => void;
}

export function PreviewPanelBody({ active, loading, html, error, failed, onRetry }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!active) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
        <p className="font-display text-base font-semibold">{t("workspace:vista_previa_del_ova")}</p>
        <p className="max-w-xs text-sm text-muted-foreground">{t(failed ? "workspace:previewFailed" : "workspace:los_recursos_apareceran_aqui_a_medida_que_se_generen")}</p>
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-destructive">{t("workspace:no_se_pudo_cargar_la_vista_previa_de_este_recurso")}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="max-sm:h-11" onClick={onRetry}>
            {t("workspace:reintentar")} </Button>
        )}
      </div>
    );
  }
  return (
    <>
      {loading && (
        <div role="status" aria-label={t("workspace:cargando_vista_previa")} className="space-y-3 p-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}
      {!loading && html && <HtmlPreviewFrame html={html} className="block h-full min-h-0 w-full border-0" height={null} title={active.label} />}
    </>
  );
}
