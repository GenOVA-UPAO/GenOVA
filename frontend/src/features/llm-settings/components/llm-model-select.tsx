import { Icon } from "@/core/components/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { cn } from "@/core/lib/cn";

import { joinModelValue, splitModelValue } from "../hooks/model-value";
import { useModelCombobox } from "../hooks/use-model-combobox";
import { type SearchableModel, toOption } from "../lib/model-search";
import { ModelComboboxPanel } from "./model-combobox-panel";

interface LlmModelSelectProps {
  models: SearchableModel[];
  provider?: string;
  modelId?: string;
  disabled?: boolean;
  invalid?: boolean;
  ariaLabel: string;
  onChange: (next: { provider: string; modelId: string }) => void;
}

/**
 * Selector de modelo con búsqueda. Era un <select> con los ~450 modelos del
 * catálogo, sin forma de encontrar uno salvo haciendo scroll.
 */
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
  // El elegido va primero: con cientos de modelos no aparecía al abrir la lista.
  const options = withCurrentStub(models, provider, modelId)
    .map((model) => toOption(model, joinModelValue(model.provider, model.model_id)))
    .sort((a, b) => Number(b.value === current) - Number(a.value === current));
  const selected = options.find((option) => option.value === current);
  const state = useModelCombobox(options, current, (value) => {
    onChange(splitModelValue(value));
  });

  return (
    <Popover open={state.open} onOpenChange={state.setOpen}>
      <PopoverTrigger
        disabled={disabled}
        role="combobox"
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-haspopup="listbox"
        className={cn(
          "flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-card px-3 text-left text-sm transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:h-9 dark:bg-input/30",
          invalid && "border-destructive ring-3 ring-destructive/20",
        )}
      >
        {selected ? (
          <>
            <span className="min-w-0 truncate">{selected.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{selected.providerLabel}</span>
          </>
        ) : (
          <span className="text-muted-foreground">Elige un modelo</span>
        )}
        <Icon name="caret-down" size="text-sm" className="ml-auto shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0">
        <ModelComboboxPanel state={state} current={current} label={ariaLabel} />
      </PopoverContent>
    </Popover>
  );
}

function withCurrentStub(
  models: SearchableModel[],
  provider: string | undefined,
  modelId: string | undefined,
): SearchableModel[] {
  if (!provider || !modelId) return models;
  if (models.some((model) => model.provider === provider && model.model_id === modelId)) {
    return models;
  }
  return [{ provider, model_id: modelId, label: modelId }, ...models];
}
