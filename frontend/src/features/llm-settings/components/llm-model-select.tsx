import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";
import { cn } from "@/core/lib/cn";

import { joinModelValue, splitModelValue } from "../hooks/model-value";
import { PROVIDER_LABELS } from "../lib/llm-catalog.utils";

interface SelectModel {
  provider: string;
  model_id: string;
  label?: string;
}

interface LlmModelSelectProps {
  models: SelectModel[];
  provider?: string;
  modelId?: string;
  disabled?: boolean;
  invalid?: boolean;
  ariaLabel: string;
  onChange: (next: { provider: string; modelId: string }) => void;
}

export function LlmModelSelect({
  models,
  provider,
  modelId,
  disabled = false,
  invalid = false,
  ariaLabel,
  onChange,
}: Readonly<LlmModelSelectProps>) {
  const current = joinModelValue(provider, modelId);
  const display = withCurrentStub(models, provider, modelId);

  return (
    <Select
      value={current === "" ? undefined : current}
      disabled={disabled}
      onValueChange={(value) => {
        onChange(splitModelValue(value));
      }}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={cn("w-full max-sm:h-11", invalid && "border-destructive")}
      >
        <SelectValue placeholder="Elige un modelo" />
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="max-h-80">
        {display.map((model) => {
          const value = joinModelValue(model.provider, model.model_id);
          return (
            <SelectItem key={value} value={value}>
              <span className="min-w-0 truncate">{model.label ?? model.model_id}</span>
              <span className="shrink-0 text-muted-foreground">
                {PROVIDER_LABELS[model.provider] ?? model.provider}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function withCurrentStub(
  models: SelectModel[],
  provider: string | undefined,
  modelId: string | undefined,
): SelectModel[] {
  if (!provider || !modelId) return models;
  if (models.some((model) => model.provider === provider && model.model_id === modelId)) {
    return models;
  }
  return [{ provider, model_id: modelId, label: modelId }, ...models];
}
