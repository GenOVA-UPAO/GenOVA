import { useTranslation } from "react-i18next";
/** Recordatorio de las cinco fases del modelo 5E, en la columna lateral. */
export function PhaseFiveENote() {
  const { t } = useTranslation();
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold">{t("workspace:modelo_5e")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("workspace:fiveEPhases")} </p>
    </section>
  );
}
