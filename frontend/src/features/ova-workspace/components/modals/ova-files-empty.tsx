import { useTranslation } from "react-i18next";
/** Sin adjuntos: una línea bajo la zona de arrastre (antes era un segundo estado vacío con borde). */
export function OvaFilesEmpty() {
  const { t } = useTranslation();
  return (
    <p className="text-xs text-muted-foreground">
      {t("workspace:emptyFilesHint")} </p>
  );
}
