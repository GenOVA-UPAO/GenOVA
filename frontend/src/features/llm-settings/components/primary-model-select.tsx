import type { TaskDraft } from "../lib/llm-config-draft";
import { taskMeta } from "../lib/task-meta";
import { LlmModelSelect } from "./llm-model-select";

interface PrimarySelectProps {
  task: string;
  value: TaskDraft;
  models: { provider: string; model_id: string; label?: string }[];
  disabled: boolean;
  onChange: (next: TaskDraft) => void;
}

export function PrimaryModelSelect({
  task,
  value,
  models,
  disabled,
  onChange,
}: Readonly<PrimarySelectProps>) {
  const labelId = `primary-model-${task}`;
  return (
    <div className="space-y-2">
      <p id={labelId} className="text-sm font-medium">
        Modelo principal
      </p>
      <p className="text-xs text-muted-foreground">Se usa siempre que responda.</p>
      <LlmModelSelect
        models={models}
        provider={value.default.provider}
        modelId={value.default.model_id}
        disabled={disabled}
        ariaLabel={`Modelo principal de ${taskMeta(task).label}`}
        onChange={(next) => {
          onChange({
            ...value,
            default: { ...value.default, provider: next.provider, model_id: next.modelId },
          });
        }}
      />
    </div>
  );
}
