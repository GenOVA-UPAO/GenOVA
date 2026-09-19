import { Icon } from "@/core/components/icon";

import type { SlotIssue } from "../lib/chain-validation";
import {
  addFallback,
  type Entry,
  moveFallback,
  removeFallback,
  setFallback,
  type TaskDraft,
} from "../lib/llm-config-draft";
import { LlmTaskRowItem } from "./llm-task-row-item";

interface FallbackChainProps {
  task: string;
  value: TaskDraft;
  fallbacks: Entry[];
  models: { provider: string; model_id: string; label?: string; modality?: string }[];
  disabled: boolean;
  issues: SlotIssue[];
  onChange: (next: TaskDraft) => void;
}

export function FallbackChain({
  task,
  value,
  fallbacks,
  models,
  disabled,
  issues,
  onChange,
}: Readonly<FallbackChainProps>) {
  function emit(patch: Partial<TaskDraft>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="space-y-4">
      <span className="flex items-center gap-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">
        Cadena de fallback
      </span>
      {fallbacks.length === 0 ? (
        <p className="rounded-2xl border border-border/50 bg-muted/30 p-4 text-center text-xs font-medium text-muted-foreground/80 italic">
          No hay modelos de respaldo configurados. Si el primario falla, se detendrá la tarea.
        </p>
      ) : null}
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
      <div className="pt-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            emit({ fallbacks: addFallback(fallbacks) });
          }}
          className="inline-flex w-full items-center justify-center rounded-md border border-dashed border-border bg-background py-5 text-xs font-bold text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-accent hover:text-primary focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
        >
          <Icon name="plus" size="text-base" className="mr-2" />
          Añadir modelo de respaldo
        </button>
      </div>
    </div>
  );
}
