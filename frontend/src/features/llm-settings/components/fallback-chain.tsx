import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { SlotIssue } from "../lib/chain-validation";
import {
  addFallback,
  type Entry,
  moveFallback,
  removeFallback,
  setFallback,
  type TaskDraft,
} from "../lib/llm-config-draft";
import type { RichModel } from "../lib/model-facts";
import { LlmTaskRowItem } from "./llm-task-row-item";

interface FallbackChainProps {
  task: string;
  value: TaskDraft;
  fallbacks: Entry[];
  models: RichModel[];
  disabled: boolean;
  issues: SlotIssue[];
  /** Dónde se usa cada modelo, sin contar el respaldo `index` que se edita. */
  usageFor?: (index: number) => Record<string, string[]>;
  onChange: (next: TaskDraft) => void;
}

export function FallbackChain({
  task,
  value,
  fallbacks,
  models,
  disabled,
  issues,
  usageFor,
  onChange,
}: Readonly<FallbackChainProps>) {
  const { t } = useTranslation("llm-settings");

  function emit(patch: Partial<TaskDraft>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">
          {t("tasks.fallbackModelsTitle")}
          {fallbacks.length > 0 ? (
            <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
              ({fallbacks.length})
            </span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("tasks.fallbackChainDesc")}
        </p>
      </div>
      {fallbacks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          {t("tasks.noFallbacksChainDesc")}
        </p>
      ) : (
        <ol className="divide-y divide-border rounded-lg border border-border">
          {fallbacks.map((entry, index) => (
            <LlmTaskRowItem
              key={`${entry.provider}:${entry.model_id}:${String(index)}`}
              index={index}
              total={fallbacks.length}
              entry={entry}
              task={task}
              models={models}
              disabled={disabled}
              issues={issues}
              usage={usageFor?.(index)}
              onChange={(provider, modelId) => {
                emit({ fallbacks: setFallback(fallbacks, index, provider, modelId) });
              }}
              onMove={(dir) => {
                emit({ fallbacks: moveFallback(fallbacks, index, dir) });
              }}
              onRemove={() => {
                emit({ fallbacks: removeFallback(fallbacks, index) });
              }}
            />
          ))}
        </ol>
      )}
      <Button
        variant="outline"
        className="max-sm:h-11 max-sm:w-full"
        disabled={disabled}
        onClick={() => {
          emit({ fallbacks: addFallback(fallbacks) });
        }}
      >
        <Icon name="plus" size="text-sm" />
        {t("tasks.addFallback")}
      </Button>
    </div>
  );
}

