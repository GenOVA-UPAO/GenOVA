import { PROVIDER_LABELS } from "./llm-catalog.utils";
import { modelDisplayName } from "./model-name";

export interface SearchableModel {
  provider: string;
  model_id: string;
  label?: string;
}

export interface ModelOption {
  value: string;
  name: string;
  provider: string;
  providerLabel: string;
}

/** Más de esto no se pinta de golpe: con 455 modelos la lista tardaba en abrir. */
export const MAX_VISIBLE_OPTIONS = 80;

export function toOption(model: SearchableModel, value: string): ModelOption {
  const providerLabel = PROVIDER_LABELS[model.provider] ?? model.provider;
  return {
    value,
    name: withoutProviderSuffix(modelDisplayName(model.label, model.model_id), providerLabel),
    provider: model.provider,
    providerLabel,
  };
}

/** «DeepSeek V4 Flash (OpenRouter)» junto a la etiqueta «OpenRouter» lo repetía. */
export function withoutProviderSuffix(name: string, providerLabel: string): string {
  const suffix = ` (${providerLabel})`;
  return name.toLowerCase().endsWith(suffix.toLowerCase()) ? name.slice(0, -suffix.length) : name;
}

/** Busca por nombre, id o proveedor; todas las palabras deben aparecer. */
export function filterOptions(
  options: ModelOption[],
  query: string,
): { visible: ModelOption[]; total: number } {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches =
    words.length === 0
      ? options
      : options.filter((option) => {
          const haystack =
            `${option.name} ${option.value} ${option.providerLabel}`.toLowerCase();
          return words.every((word) => haystack.includes(word));
        });
  return { visible: matches.slice(0, MAX_VISIBLE_OPTIONS), total: matches.length };
}
