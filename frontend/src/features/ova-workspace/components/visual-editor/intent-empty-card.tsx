import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";

interface Props {
  readonly motivo?: string | null;
  readonly razon?: string | null;
}

export function IntentEmptyCard({ motivo, razon }: Props) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-3.5 text-sm dark:border-amber-800/70 dark:bg-amber-950/30">
      <div className="flex items-start gap-2.5">
        <Icon name="warning-circle" className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1">
          <p className="font-medium text-amber-900 dark:text-amber-200">{t("workspace:instruccion_ambigua_o_no_aplicable")}</p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {motivo ?? razon ?? t("workspace:no_se_detecto_ninguna_modificacion_sobre_los__1d54a0")}
          </p>
        </div>
      </div>
    </div>
  );
}
