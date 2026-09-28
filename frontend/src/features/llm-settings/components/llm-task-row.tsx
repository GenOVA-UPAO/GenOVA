import type { SlotIssue } from "../lib/chain-validation";
import type { Draft, TaskDraft } from "../lib/llm-config-draft";
import type { RichModel } from "../lib/model-facts";
import { modelUsage } from "../lib/model-usage";
import { FallbackChain } from "./fallback-chain";
import { PrimaryModelSelect } from "./primary-model-select";

interface LlmTaskRowProps {
  task: string;
  value: TaskDraft;
  models: RichModel[];
  disabled?: boolean;
  issues?: SlotIssue[];
  /** Configuración completa: para decir en qué otras tareas se usa cada modelo. */
  draft?: Draft | null;
  tasks?: string[];
  onChange: (next: TaskDraft) => void;
  onApplyToOthers?: () => void;
}

/** Modelo principal y modelos de respaldo de una tarea, sin tarjetas anidadas. */
export function LlmTaskRow({
  task,
  value,
  models,
  disabled = false,
  issues = [],
  draft,
  tasks = [],
  onChange,
  onApplyToOthers,
}: Readonly<LlmTaskRowProps>) {
  // El borrador de esta tarea es `value` (puede ir por delante de `draft`).
  const full: Draft = { ...draft, [task]: value };
  const taskList = tasks.includes(task) ? tasks : [...tasks, task];
  return (
    <div className="space-y-6" data-testid="task-row-editor">
      <PrimaryModelSelect
        task={task}
        value={value}
        models={models}
        disabled={disabled}
        usage={modelUsage(full, taskList, { task, index: -1 })}
        onChange={onChange}
        onApplyToOthers={onApplyToOthers}
      />
      <FallbackChain
        task={task}
        value={value}
        fallbacks={value.fallbacks}
        models={models}
        disabled={disabled}
        issues={issues}
        usageFor={(index) => modelUsage(full, taskList, { task, index })}
        onChange={onChange}
      />
    </div>
  );
}
