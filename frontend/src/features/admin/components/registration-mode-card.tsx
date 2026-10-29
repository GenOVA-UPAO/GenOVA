import { useTranslation } from "react-i18next";

import { Switch } from "@/core/components/ui/switch";

interface RegistrationModeCardProps {
  tesis: boolean;
  saving: boolean;
  onToggle: () => void;
}

/** Rol que reciben las cuentas nuevas (modo tesis) explicado junto al interruptor. */
export function RegistrationModeCard({
  tesis,
  saving,
  onToggle,
}: Readonly<RegistrationModeCardProps>) {
  const { t } = useTranslation("admin");

  return (
    <section
      aria-labelledby="registration-mode-title"
      className="flex items-start justify-between gap-6 rounded-xl border border-border bg-card px-5 py-4"
    >
      <div className="min-w-0 space-y-1">
        <h2 id="registration-mode-title" className="text-base font-semibold">
          {t("thesis.title")}
        </h2>
        <p id="registration-mode-desc" className="max-w-prose text-sm text-muted-foreground">
          {tesis ? t("thesis.enabledDesc") : t("thesis.disabledDesc")}
        </p>
      </div>
      <Switch
        checked={tesis}
        onCheckedChange={onToggle}
        aria-label={t("thesis.title")}
        aria-describedby="registration-mode-desc"
        aria-busy={saving || undefined}
        disabled={saving}
        className="mt-0.5 disabled:cursor-wait"
      />
    </section>
  );
}
