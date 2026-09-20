import { joinModelValue, splitModelValue } from "../hooks/model-value";

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
  ariaLabel: string;
  onChange: (next: { provider: string; modelId: string }) => void;
}

export function LlmModelSelect({
  models,
  provider,
  modelId,
  disabled = false,
  ariaLabel,
  onChange,
}: Readonly<LlmModelSelectProps>) {
  const current = joinModelValue(provider, modelId);
  const display = withCurrentStub(models, provider, modelId);

  return (
    <select
      aria-label={ariaLabel}
      disabled={disabled}
      value={current}
      onChange={(event) => {
        onChange(splitModelValue(event.target.value));
      }}
      className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <option value="">— elegir modelo —</option>
      {display.map((model) => {
        const value = joinModelValue(model.provider, model.model_id);
        return (
          <option key={value} value={value}>
            {(model.label ?? model.model_id) + " · " + model.provider}
          </option>
        );
      })}
    </select>
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
