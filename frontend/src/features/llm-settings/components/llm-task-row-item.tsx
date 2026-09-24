import { cn } from "@/core/lib/cn";

import type { SlotIssue } from "../lib/chain-validation";
import type { Entry } from "../lib/llm-config-draft";
import { findModel, type RichModel } from "../lib/model-facts";
import { taskMeta } from "../lib/task-meta";
import { FallbackActions } from "./fallback-actions";
import { FallbackIndex } from "./fallback-index";
import { LlmModelSelect } from "./llm-model-select";
import { ModelSummary } from "./model-summary";
import { ModelTestButton } from "./model-test-button";

interface LlmTaskRowItemProps {
  index: number;
  total: number;
  entry: Entry;
  task: string;
  models: RichModel[];
  disabled: boolean;
  issues: SlotIssue[];
  usage?: Record<string, string[]>;
  onChange: (provider: string, modelId: string) => void;
  onMove: (dir: number) => void;
  onRemove: () => void;
}

/**
 * Un respaldo de la cadena. En móvil: posición y acciones arriba y el selector
 * a lo ancho debajo (antes el número quedaba solo en una línea y las flechas
 * en otra).
 */
export function LlmTaskRowItem({
  index,
  total,
  entry,
  task,
  models,
  disabled,
  issues,
  usage,
  onChange,
  onMove,
  onRemove,
}: Readonly<LlmTaskRowItemProps>) {
  const { issue, isError } = slotState(issues, index);
  const chosen = chosenModel(models, entry);
  const summaryId = `fallback-summary-${task}-${String(index)}`;

  return (
    <li
      className={cn(
        "grid grid-cols-[1fr_auto] items-start gap-x-3 gap-y-1 p-3 sm:grid-cols-[auto_1fr_auto]",
        isError && "bg-destructive/5",
      )}
    >
      <FallbackIndex index={index} modality={modalityOf(chosen)} />
      <div className="col-span-2 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-1">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <div className="w-full min-w-0 flex-1">
            <LlmModelSelect
              models={models}
              provider={entry.provider}
              modelId={entry.model_id}
              disabled={disabled}
              invalid={isError}
              usage={usage}
              describedBy={chosen ? summaryId : undefined}
              ariaLabel={`Modelo de respaldo ${String(index + 1)} de ${taskMeta(task).label}`}
              onChange={(next) => {
                onChange(next.provider, next.modelId);
              }}
            />
          </div>
          {chosen ? (
            <ModelTestButton provider={entry.provider} modelId={entry.model_id} disabled={disabled} />
          ) : null}
        </div>
        <ModelSummary id={summaryId} model={chosen} variant="compact" />
        {issue ? (
          <p
            className={cn("mt-1.5 text-xs", isError ? "text-destructive" : "text-muted-foreground")}
            role={isError ? "alert" : undefined}
          >
            {issue}
          </p>
        ) : null}
      </div>
      <div className="col-start-2 row-start-1 sm:col-start-3">
        <FallbackActions
          disabled={disabled}
          index={index}
          total={total}
          onMove={onMove}
          onRemove={onRemove}
        />
      </div>
    </li>
  );
}

function slotState(issues: SlotIssue[], index: number): { issue?: string; isError: boolean } {
  const slotIssue = issues.find((item) => item.index === index);
  // Una fila recién añadida sin modelo no es un error: es el siguiente paso.
  return { issue: slotIssue?.message, isError: slotIssue?.kind === "duplicate" };
}

function chosenModel(models: RichModel[], entry: Entry): RichModel | undefined {
  return entry.provider && entry.model_id ? findModel(models, entry.provider, entry.model_id) : undefined;
}

function modalityOf(model: RichModel | undefined): string {
  const modality = model?.modality;
  // Las del catálogo completo vienen como «text->text»: solo cuentan las simples.
  return modality && !modality.includes("->") ? modality : "text";
}
