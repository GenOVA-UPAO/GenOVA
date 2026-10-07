import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";

import { useLlmSettings } from "../hooks/use-llm-settings";
import { TASK_LABELS } from "../lib/llm-settings-labels";
import { LlmSettingsFormTask } from "./llm-settings-form-task";
import { LlmSettingsPlatformTask } from "./llm-settings-platform-task";

export function LlmSettingsForm({ readOnly = false }: Readonly<{ readOnly?: boolean }>) {
  const { t } = useTranslation(["llm-settings", "common"]);
  const store = useLlmSettings();
  const locked = store.saving || readOnly;
  const taskKeys = Object.keys(TASK_LABELS);
  const noCatalog = Object.keys(store.catalog).every((provider) => {
    const models = store.catalog[provider];
    return !Array.isArray(models) || models.length === 0;
  });

  if (store.error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-sm text-muted-foreground">{store.error}</p>
        <Button variant="outline" onClick={store.refetch}>
          {t("common:actions.retry")}
        </Button>
      </div>
    );
  }

  if (store.loading || !store.settings) {
    return (
      <div className="space-y-4 py-2" role="status" aria-busy="true" aria-label={t("form.loadingSettings")}>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border">
        {taskKeys.map((tipo) =>
          readOnly ? (
            <LlmSettingsPlatformTask key={tipo} tipo={tipo} label={TASK_LABELS[tipo] ?? tipo} />
          ) : (
            <LlmSettingsFormTask key={tipo} tipo={tipo} locked={locked} />
          ),
        )}
      </ul>
      {noCatalog && !readOnly ? (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p className="flex-1">
            {t("form.catalogLoadError")}
          </p>
          <Button
            variant="outline"
            size="sm"
            loading={store.refreshingCatalog}
            onClick={() => {
              void store.retryRefresh();
            }}
          >
            {t("common:actions.retry")}
          </Button>
        </div>
      ) : null}
      {readOnly ? null : (
        <p className="text-xs text-muted-foreground">
          {t("form.timeoutRange", { min: store.bounds[0], max: store.bounds[1] })}
        </p>
      )}
    </div>
  );
}
