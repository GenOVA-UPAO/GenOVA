import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";

interface UserOverrideHeaderProps {
  isOverride: boolean;
  disabled: boolean;
  onUsePlatform: () => void;
}

/** Título de «Tu modelo»: dice si la tarea usa tu elección o sigue a la plataforma. */
export function UserOverrideHeader({
  isOverride,
  disabled,
  onUsePlatform,
}: Readonly<UserOverrideHeaderProps>) {
  const { t } = useTranslation("llm-settings");

  return (
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className="text-sm font-medium">{t("tasks.userOverride")}</p>
        <p className="text-xs text-muted-foreground">
          {isOverride
            ? t("tasks.userOverrideDesc")
            : t("tasks.userOverridePlatformDesc")}
        </p>
      </div>
      {isOverride ? (
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          disabled={disabled}
          onClick={onUsePlatform}
        >
          {t("tasks.revertToPlatform")}
        </Button>
      ) : null}
    </div>
  );
}

