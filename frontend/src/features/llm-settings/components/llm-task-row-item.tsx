import { cn } from "@/core/lib/cn";

import type { SlotIssue } from "../lib/chain-validation";
import type { Entry } from "../lib/llm-config-draft";
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
  const issue = issues.find((item) => item.index === index)?.message;
  const found = models.find((m) => m.provider === entry.provider && m.model_id === entry.model_id);
  const modality = found?.modality ?? "text";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-4 shadow-sm transition sm:flex-row sm:items-center",
        issue ? "border-destructive bg-destructive/5" : rowTone(disabled),
      )}
    >
      <FallbackIndex index={index} modality={modality} />
      <div className="min-w-0 flex-1">
        <LlmModelSelect
          models={models}
          provider={entry.provider}
          modelId={entry.model_id}
          disabled={disabled}
          ariaLabel={`Fallback ${String(index + 1)} de ${task}`}
          onChange={(next) => {
            onChange(next.provider, next.modelId);
          }}
        />
        {issue ? (
          <p className="mt-1.5 text-xs font-medium text-destructive" role="alert">
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
    </div>
  );
}

function rowTone(disabled: boolean): string {
  return disabled ? "border-border/50 bg-muted/20" : "border-border bg-card/50 hover:bg-accent/30";
}
