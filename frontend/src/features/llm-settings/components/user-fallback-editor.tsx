import { Icon } from "@/core/components/icon";

import { useLlmSettings } from "../hooks/use-llm-settings";
import type { ChipModel } from "../lib/model-task-card.helpers";
import { LlmModelSelect } from "./llm-model-select";
import { UserFallbackSummary } from "./user-fallback-summary";

interface UserFallbackEditorProps {
  fallbacks: { provider: string; model_id: string }[];
  models: ChipModel[];
  chip: string;
  num: string;
  task: string;
  disabled: boolean;
}

export function UserFallbackEditor({
  fallbacks,
  models,
  chip,
  num,
  task,
  disabled,
}: Readonly<UserFallbackEditorProps>) {
  const store = useLlmSettings();
  return (
    <div className="space-y-2.5">
      <UserFallbackSummary
        fallbacks={fallbacks}
        models={models}
        chip={chip}
        num={num}
        task={task}
      />
      {fallbacks.map((item, index) =>
        item.provider && item.model_id ? null : (
          <div key={String(index)} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground">#{index + 1}</span>
            <div className="flex-1">
              <LlmModelSelect
                models={models}
                provider={item.provider ? item.provider : undefined}
                modelId={item.model_id ? item.model_id : undefined}
                disabled={disabled}
                ariaLabel={`Mi fallback ${String(index + 1)} ${task}`}
                onChange={(ev) => {
                  store.setFallback(task, index, ev.provider, ev.modelId);
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                store.removeFallback(task, index);
              }}
              disabled={disabled}
              className="rounded p-1 text-muted-foreground hover:text-destructive"
            >
              <Icon name="trash" size="text-xs" />
            </button>
          </div>
        ),
      )}
      <button
        type="button"
        onClick={() => {
          store.addFallback(task);
        }}
        disabled={disabled}
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-primary"
      >
        + Añadir respaldo
      </button>
    </div>
  );
}
