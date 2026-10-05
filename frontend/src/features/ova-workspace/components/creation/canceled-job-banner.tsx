import { useTranslation } from "react-i18next";
export function CanceledJobBanner() {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border bg-muted/40 p-3 text-sm" role="status">
      <p className="font-medium">{t("workspace:la_generacion_se_cancelo_a_peticion_tuya")}</p>
      <p className="mt-1 text-muted-foreground">
        {t("workspace:no_es_un_error_lo_que_ya_se_alcanzo_a_generar_2bc092")} </p>
    </div>
  );
}
