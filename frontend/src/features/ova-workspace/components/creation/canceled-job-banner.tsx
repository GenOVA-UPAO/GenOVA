import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";

export function CanceledJobBanner({ onRetry }: Readonly<{ onRetry?: () => void }>) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-sm" role="status">
      <p className="font-medium">{t("workspace:la_generacion_se_cancelo_a_peticion_tuya")}</p>
      <p className="mt-1 text-muted-foreground">
        {t("workspace:generationCanceledHint")} </p>
      {onRetry && <Button variant="outline" className="mt-3" onClick={onRetry}>{t("workspace:reintentar_generacion")}</Button>}
    </div>
  );
}
