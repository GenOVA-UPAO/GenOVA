import type { SlotIssue } from "../lib/chain-validation";
import type { TaskDraft } from "../lib/llm-config-draft";
import { FallbackChain } from "./fallback-chain";
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

/** Modelo principal y modelos de respaldo de una tarea, sin tarjetas anidadas. */
export function LlmTaskRow({
  task,
  value,
  models,
  disabled = false,
  issues = [],
  onChange,
}: Readonly<LlmTaskRowProps>) {
  return (
    <div className="space-y-6" data-testid="task-row-editor">
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
        fallbacks={value.fallbacks}
        models={models}
        disabled={disabled}
        issues={issues}
        onChange={onChange}
      />
    </div>
  );
}
