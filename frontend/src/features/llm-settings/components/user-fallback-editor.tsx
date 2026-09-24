import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { useLlmSettings } from "../hooks/use-llm-settings";
import type { ChipModel } from "../lib/model-task-card.helpers";
import { taskMeta } from "../lib/task-meta";
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
            <span className="w-5 text-sm text-muted-foreground tabular-nums">{index + 1}.</span>
            <div className="flex-1">
              <LlmModelSelect
                models={models}
                provider={item.provider ? item.provider : undefined}
                modelId={item.model_id ? item.model_id : undefined}
                disabled={disabled}
                ariaLabel={`Tu modelo de respaldo ${String(index + 1)} para ${taskMeta(task).label}`}
                onChange={(ev) => {
                  store.setFallback(task, index, ev.provider, ev.modelId);
                }}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Quitar modelo de respaldo ${String(index + 1)}`}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive max-sm:size-11"
              onClick={() => {
                store.removeFallback(task, index);
              }}
              disabled={disabled}
            >
              <Icon name="trash" size="text-base" />
            </Button>
          </div>
        ),
      )}
      <Button
        variant="outline"
        size="sm"
        className="max-sm:h-11"
        onClick={() => {
          store.addFallback(task);
        }}
        disabled={disabled}
      >
        <Icon name="plus" size="text-sm" /> Añadir modelo de respaldo
      </Button>
    </div>
  );
}
