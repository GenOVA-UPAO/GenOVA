import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";

interface Props {
  isStalled: boolean;
  showResume: boolean;
  resumableCount: number;
  total: number;
  resuming: boolean;
  showCancel: boolean;
  onResume: () => void;
  onCancel: () => void;
}

export function ProgressBanners({
  isStalled,
  showResume,
  resumableCount,
  total,
  resuming,
  showCancel,
  onResume,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (!isStalled && !showResume) return null;
  return (
    <>
      {isStalled && (
        <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
          <p className="font-medium text-foreground">
            {t("workspace:generationInactiveHint")} </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onResume}
            >
              {t("workspace:reanudar")} </Button>
            {showCancel && (
              <Button
                variant="outline"
                size="sm"
                className="text-muted-foreground"
                onClick={onCancel}
              >
                {t("workspace:cancelar")} </Button>
            )}
          </div>
        </div>
      )}
      {showResume && (
        <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
          <p className="font-medium text-foreground">
            {t("workspace:la_generacion_se_interrumpio_a_mitad_quedan")} {resumableCount} {t("workspace:de")} {total} {t("workspace:generationResumeHint")} </p>
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={resuming}
              onClick={onResume}
            >
              {resuming ? t("workspace:reanudando") : t("workspace:reanudar_generacion")}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
