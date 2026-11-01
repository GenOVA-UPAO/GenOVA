import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";
import { Switch } from "@/core/components/ui/switch";

interface RegistrationModeCardProps {
  tesis: boolean;
  saving: boolean;
  /** Aún no se conoce el modo guardado (cargando o con error): no se puede cambiar. */
  unavailable: boolean;
  loadFailed: boolean;
  onToggle: () => void;
  onRetry: () => void;
}

/** Rol que reciben las cuentas nuevas (modo tesis) explicado junto al interruptor. */
export function RegistrationModeCard({
  tesis,
  saving,
  unavailable,
  loadFailed,
  onToggle,
  onRetry,
}: Readonly<RegistrationModeCardProps>) {
  const { t } = useTranslation("admin");
  const loading = unavailable && !loadFailed;
  let description = tesis ? t("thesis.enabledDesc") : t("thesis.disabledDesc");
  if (loading) description = t("thesis.loading");

  return (
    <section
      aria-labelledby="registration-mode-title"
      className="flex items-start justify-between gap-6 rounded-xl border border-border bg-card px-5 py-4"
    >
      <div className="min-w-0 space-y-1">
        <h2 id="registration-mode-title" className="text-base font-semibold">
          {t("thesis.title")}
        </h2>
        {loadFailed ? (
          <div role="alert" className="flex flex-wrap items-center gap-3">
            <p id="registration-mode-desc" className="max-w-prose text-sm text-destructive">
              {t("thesis.loadError")}
            </p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              {t("shared:reintentar")}
            </Button>
          </div>
        ) : (
          <p id="registration-mode-desc" className="max-w-prose text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <Switch
        checked={tesis}
        onCheckedChange={onToggle}
        aria-label={t("thesis.title")}
        aria-describedby="registration-mode-desc"
        aria-busy={saving || loading || undefined}
        disabled={saving || unavailable}
        className="mt-0.5 disabled:cursor-wait"
      />
    </section>
  );
}
