import { cn } from "@/core/lib/cn";

import type { SlotIssue } from "../lib/chain-validation";
import type { Entry } from "../lib/llm-config-draft";
import { taskMeta } from "../lib/task-meta";
import { FallbackActions } from "./fallback-actions";
import { FallbackIndex } from "./fallback-index";
import { LlmModelSelect } from "./llm-model-select";

interface LlmTaskRowItemProps {
  index: number;
  total: number;
  entry: Entry;
  task: string;
  models: { provider: string; model_id: string; label?: string; modality?: string }[];
  disabled: boolean;
  issues: SlotIssue[];
  onChange: (provider: string, modelId: string) => void;
  onMove: (dir: number) => void;
  onRemove: () => void;
}

export function LlmTaskRowItem({
  index,
  total,
  entry,
  task,
  models,
  disabled,
  issues,
  onChange,
  onMove,
  onRemove,
}: Readonly<LlmTaskRowItemProps>) {
  const slotIssue = issues.find((item) => item.index === index);
  const issue = slotIssue?.message;
  // Una fila recién añadida sin modelo no es un error: es el siguiente paso.
  const isError = slotIssue?.kind === "duplicate";
  const found = models.find((m) => m.provider === entry.provider && m.model_id === entry.model_id);
  const modality = found?.modality ?? "text";

  return (
    <li
      className={cn(
        "flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:gap-3",
        isError && "bg-destructive/5",
      )}
    >
      <FallbackIndex index={index} modality={modality} />
      <div className="min-w-0 flex-1">
        <LlmModelSelect
          models={models}
          provider={entry.provider}
          modelId={entry.model_id}
          disabled={disabled}
          invalid={isError}
          ariaLabel={`Modelo de respaldo ${String(index + 1)} de ${taskMeta(task).label}`}
          onChange={(next) => {
            onChange(next.provider, next.modelId);
          }}
        />
        {issue ? (
          <p
            className={cn("mt-1.5 text-xs", isError ? "text-destructive" : "text-muted-foreground")}
            role={isError ? "alert" : undefined}
          >
            {issue}
          </p>
        ) : null}
      </div>
      <FallbackActions
        disabled={disabled}
        index={index}
        total={total}
        onMove={onMove}
        onRemove={onRemove}
      />
    </li>
  );
}
