import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";

interface Props {
  readonly motivo?: string | null;
}

export function IntentOutOfScopeCard({ motivo }: Props) {
  const { t } = useTranslation();
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3.5 text-sm dark:border-blue-900 dark:bg-blue-950/30">
      <div className="flex items-start gap-2.5">
        <Icon name="info" className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-950 dark:text-blue-200">{t("workspace:solo_puedo_editar_la_estructura")}</p>
          <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
            {motivo ??
              t("workspace:structureOnlyHint")}
          </p>
        </div>
      </div>
    </div>
  );
}
