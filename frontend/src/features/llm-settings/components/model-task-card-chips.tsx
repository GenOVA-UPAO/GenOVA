import { useTranslation } from "react-i18next";

import { chipLabel, type ChipModel } from "../lib/model-task-card.helpers";

interface ModelTaskCardChipsProps {
  fallbacks: { provider: string; model_id: string }[];
  models: ChipModel[];
  /** Se conservan por compatibilidad con los llamadores; la lista ya no usa chips. */
  chip?: string;
  num?: string;
}

/**
 * Modelos de respaldo de solo lectura, en orden. Antes eran chips con un
 * símbolo de modalidad («Aa 1. …») sin título que dijera qué eran.
 */
export function ModelTaskCardChips({ fallbacks, models }: Readonly<ModelTaskCardChipsProps>) {
  const { t } = useTranslation("llm-settings");

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{t("tasks.fallbackModelsTitle")}</p>
      {fallbacks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("tasks.noFallbacksDesc")}
        </p>
      ) : (
        <ol className="space-y-1 text-sm">
          {fallbacks.map((item, index) => (
            <li key={`${item.provider}:${item.model_id}:${String(index)}`} className="flex gap-2">
              <span className="w-4 shrink-0 text-right text-muted-foreground tabular-nums">
                {index + 1}.
              </span>
              <span className="min-w-0 truncate" title={chipLabel(item, models)}>
                {chipLabel(item, models)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
