import { useTranslation } from "react-i18next";
/** Shown while the first route's guard loader resolves (initial load only). */
export function AppSplash() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full items-center justify-center" role="status" aria-label={t("shell:cargando")}>
      <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
    </div>
  );
}
