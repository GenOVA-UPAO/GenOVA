import type { SlotIssue } from "../lib/chain-validation";
import type { TaskDraft } from "../lib/llm-config-draft";
import { FallbackChain } from "./fallback-chain";
import { TASK_DESCS, TASK_LABELS } from "./llm-task-row.helpers";
import { PrimaryModelSelect } from "./primary-model-select";

interface SelectableModel {
  provider: string;
  model_id: string;
  label?: string;
  modality?: string;
}

interface LlmTaskRowProps {
  task: string;
  value: TaskDraft;
  models: SelectableModel[];
  disabled?: boolean;
  issues?: SlotIssue[];
  onChange: (next: TaskDraft) => void;
}

export function LlmTaskRow({
  task,
  value,
  models,
  disabled = false,
  issues = [],
  onChange,
}: Readonly<LlmTaskRowProps>) {
  const fallbacks = value.fallbacks;
  const label = TASK_LABELS[task] ?? task;
  const desc = TASK_DESCS[task] ?? "Configuración de modelos de IA";

  return (
    <div className="glass-card overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:border-primary/20">
      <div className="border-b border-border/50 bg-muted/20 px-6 py-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h3 className="font-display text-base font-bold text-foreground">{label}</h3>
            <p className="mt-1 text-[11px] leading-snug font-medium text-muted-foreground">{desc}</p>
          </div>
          <span className="self-start rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold tracking-widest text-primary uppercase">
            {fallbacks.length} fallback{fallbacks.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
      <div className="space-y-6 p-6">
        <PrimaryModelSelect
          task={task}
          value={value}
          models={models}
          disabled={disabled}
          onChange={onChange}
        />
        <FallbackChain
          task={task}
          value={value}
          fallbacks={fallbacks}
          models={models}
          disabled={disabled}
          issues={issues}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
