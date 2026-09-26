import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { TaskDraft } from "../lib/llm-config-draft";
import { findModel, type RichModel } from "../lib/model-facts";
import { taskMeta } from "../lib/task-meta";
import { LlmModelSelect } from "./llm-model-select";
import { ModelSummary } from "./model-summary";
import { ModelTestButton } from "./model-test-button";

interface PrimarySelectProps {
  task: string;
  value: TaskDraft;
  models: RichModel[];
  disabled: boolean;
  usage?: Record<string, string[]>;
  onChange: (next: TaskDraft) => void;
  /** Si se da, ofrece copiar este modelo a otras tareas. */
  onApplyToOthers?: () => void;
}

export function PrimaryModelSelect({
  task,
  value,
  models,
  disabled,
  usage,
  onChange,
  onApplyToOthers,
}: Readonly<PrimarySelectProps>) {
  const labelId = `primary-model-${task}`;
  const summaryId = `primary-model-summary-${task}`;
  const { provider, model_id: modelId } = value.default;
  const chosen = provider && modelId ? findModel(models, provider, modelId) : undefined;
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <p id={labelId} className="text-sm font-medium">
            Modelo principal
          </p>
          <p className="text-xs text-muted-foreground">Se usa siempre que responda.</p>
        </div>
        {onApplyToOthers && chosen ? (
          <Button
            variant="ghost"
            size="sm"
            className="-mr-2 text-primary max-sm:h-11"
            disabled={disabled}
            onClick={onApplyToOthers}
          >
            <Icon name="copy" size="text-sm" />
            Usar en otras tareas
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <LlmModelSelect
            models={models}
            provider={provider}
            modelId={modelId}
            disabled={disabled}
            usage={usage}
            ariaLabel={`Modelo principal de ${taskMeta(task).label}`}
            describedBy={chosen ? summaryId : undefined}
            onChange={(next) => {
              onChange({
                ...value,
                default: { ...value.default, provider: next.provider, model_id: next.modelId },
              });
            }}
          />
        </div>
        {chosen ? <ModelTestButton provider={provider} modelId={modelId} disabled={disabled} /> : null}
      </div>
      <ModelSummary id={summaryId} model={chosen} />
    </div>
  );
}
