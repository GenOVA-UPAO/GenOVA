import { useTranslation } from "react-i18next";
/** Sin adjuntos: una línea bajo la zona de arrastre (antes era un segundo estado vacío con borde). */
export function OvaFilesEmpty() {
  const { t } = useTranslation();
  return (
    <p className="text-xs text-muted-foreground">
      {t("workspace:aun_no_hay_archivos_sin_ellos_la_ia_genera_a__d8a130")} </p>
  );
}
