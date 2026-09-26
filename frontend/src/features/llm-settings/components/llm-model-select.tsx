import { useContext } from "react";

import { Icon } from "@/core/components/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/components/ui/popover";
import { cn } from "@/core/lib/cn";

import { joinModelValue, splitModelValue } from "../hooks/model-value";
import { LlmSettingsContext } from "../hooks/use-llm-settings";
import { useModelCombobox } from "../hooks/use-model-combobox";
import { type SearchableModel, toOption } from "../lib/model-search";
import { ModelComboboxPanel } from "./model-combobox-panel";
import { ModelTriggerValue } from "./model-trigger-value";

interface LlmModelSelectProps {
  models: SearchableModel[];
  provider?: string;
  modelId?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Nombre del modelo actual cuando no está en `models` (p. ej. el de la plataforma). */
  currentLabel?: string;
  /** Dónde se usa ya cada modelo (`proveedor::id` → tareas): agrupa «En uso ahora». */
  usage?: Record<string, string[]>;
  ariaLabel: string;
  /** Id del texto que describe el campo (p. ej. el resumen del modelo elegido). */
  describedBy?: string;
  onChange: (next: { provider: string; modelId: string }) => void;
}

/**
 * Selector de modelo con búsqueda, filtros y grupos. Cada opción dice lo que
 * importa para decidir (precio, contexto, capacidades, dónde se usa), para no
 * tener que abrir el catálogo a mitad de una elección.
 */
export function LlmModelSelect({
  models,
  provider,
  modelId,
  disabled = false,
  invalid = false,
  currentLabel,
  usage,
  ariaLabel,
  describedBy,
  onChange,
}: Readonly<LlmModelSelectProps>) {
  const store = useContext(LlmSettingsContext);
  const current = joinModelValue(provider, modelId);
  const options = withCurrentStub(models, { provider, modelId, label: currentLabel }).map((model) => {
    const value = joinModelValue(model.provider, model.model_id);
    return toOption(model, value, {
      // Los modelos base cuentan siempre como favoritos (el catálogo los muestra así).
      favorite: store
        ? store.isModelEnabled(model.provider, model.model_id) || store.isDefaultModel(model.provider, model.model_id)
        : false,
      usage: usage?.[value],
    });
  });
  const selected = options.find((option) => option.value === current);
  const selectedName = selected ? `${selected.name}, ${selected.providerLabel}` : "sin elegir";
  const state = useModelCombobox(options, current, (value) => {
    onChange(splitModelValue(value));
  });

  return (
    <Popover open={state.open} onOpenChange={state.setOpen}>
      <PopoverTrigger
        disabled={disabled}
        role="combobox"
        // Con aria-label el contenido no se lee: el modelo elegido va en el nombre.
        aria-label={`${ariaLabel}: ${selectedName}`}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-haspopup="listbox"
        className={cn(
          "flex h-11 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-card px-3 text-left text-sm transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 dark:bg-input/30",
          invalid && "border-destructive ring-3 ring-destructive/20",
        )}
      >
        <ModelTriggerValue option={selected} />
        <Icon name="caret-down" size="text-sm" className="shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-[min(24rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] p-0"
      >
        <ModelComboboxPanel state={state} options={options} current={current} label={ariaLabel} />
      </PopoverContent>
    </Popover>
  );
}

function withCurrentStub(
  models: SearchableModel[],
  current: { provider?: string; modelId?: string; label?: string },
): SearchableModel[] {
  const { provider, modelId, label } = current;
  if (!provider || !modelId) return models;
  if (models.some((model) => model.provider === provider && model.model_id === modelId)) {
    return models;
  }
  return [{ provider, model_id: modelId, label: label ?? modelId }, ...models];
}
