import { PROVIDER_LABELS } from "./llm-catalog.utils";
import {
  type Capability,
  formatContext,
  isCheap,
  type ModelFacts,
  modelFacts,
  priceDescription,
  type RichModel,
} from "./model-facts";
import { modelDisplayName } from "./model-name";
import { usageSummary } from "./model-usage";

/** Cualquier modelo que se pueda elegir: con lo mínimo o con los datos completos del catálogo. */
export type SearchableModel = RichModel;

export interface ModelOption {
  value: string;
  name: string;
  provider: string;
  providerLabel: string;
  facts: ModelFacts;
  favorite: boolean;
  /** Tareas que ya usan este modelo («Texto», «Código / HTML»). */
  usage: string[];
  /** Nombre, id y proveedor en minúsculas: lo que mira la búsqueda. */
  haystack: string;
}

export interface OptionContext {
  favorite?: boolean;
  usage?: string[];
}

export function toOption(model: SearchableModel, value: string, ctx: OptionContext = {}): ModelOption {
  const providerLabel = PROVIDER_LABELS[model.provider] ?? model.provider;
  const name = withoutProviderSuffix(modelDisplayName(model.label, model.model_id), providerLabel);
  return {
    value,
    name,
    provider: model.provider,
    providerLabel,
    facts: modelFacts(model),
    favorite: ctx.favorite ?? false,
    usage: ctx.usage ?? [],
    haystack: `${name} ${model.model_id} ${providerLabel}`.toLowerCase(),
  };
}

/** «DeepSeek V4 Flash (OpenRouter)» junto a la etiqueta «OpenRouter» lo repetía. */
export function withoutProviderSuffix(name: string, providerLabel: string): string {
  const suffix = ` (${providerLabel})`;
  return name.toLowerCase().endsWith(suffix.toLowerCase()) ? name.slice(0, -suffix.length) : name;
}

export interface PickerFilters {
  free: boolean;
  cheap: boolean;
  capabilities: Capability[];
  /** `null` = todos los proveedores. */
  provider: string | null;
}

export const NO_FILTERS: PickerFilters = { free: false, cheap: false, capabilities: [], provider: null };

export function hasFilters(filters: PickerFilters): boolean {
  return filters.free || filters.cheap || filters.capabilities.length > 0 || filters.provider !== null;
}

function passes(option: ModelOption, filters: PickerFilters): boolean {
  if (filters.free && !option.facts.free) return false;
  if (filters.cheap && !isCheap(option.facts)) return false;
  if (filters.provider !== null && option.provider !== filters.provider) return false;
  return filters.capabilities.every((cap) => option.facts.capabilities.includes(cap));
}

/** Busca por nombre, id o proveedor (todas las palabras deben aparecer) y aplica los filtros. */
export function filterOptions(
  options: ModelOption[],
  query: string,
  filters: PickerFilters = NO_FILTERS,
): ModelOption[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return options.filter(
    (option) => passes(option, filters) && words.every((word) => option.haystack.includes(word)),
  );
}

export type SectionKey = "in-use" | "favorites" | "recommended" | "rest";

export interface PickerSection {
  key: SectionKey;
  label: string;
  options: ModelOption[];
}

const SECTION_LABELS: Record<SectionKey, string> = {
  "in-use": "En uso ahora",
  favorites: "Favoritos",
  recommended: "Recomendados",
  rest: "Todos los modelos",
};

function sectionOf(option: ModelOption, current: string): SectionKey {
  if (option.value === current || option.usage.length > 0) return "in-use";
  if (option.favorite) return "favorites";
  if (option.facts.recommended) return "recommended";
  return "rest";
}

/** Precio de salida para ordenar; lo desconocido va al final. */
function outputPrice(option: ModelOption): number {
  if (option.facts.free) return 0;
  return option.facts.output ?? Number.POSITIVE_INFINITY;
}

/**
 * Reparte las opciones en grupos útiles para decidir: lo que ya se usa, los
 * favoritos, los recomendados y el resto. El elegido va el primero; el resto,
 * por nombre, o por precio si se buscan modelos baratos.
 */
export function sectionOptions(
  options: ModelOption[],
  current: string,
  byPrice = false,
): PickerSection[] {
  const buckets: Record<SectionKey, ModelOption[]> = {
    "in-use": [],
    favorites: [],
    recommended: [],
    rest: [],
  };
  for (const option of options) buckets[sectionOf(option, current)].push(option);
  buckets["in-use"].sort((a, b) => Number(b.value === current) - Number(a.value === current));
  buckets.rest.sort((a, b) =>
    byPrice ? outputPrice(a) - outputPrice(b) || a.name.localeCompare(b.name, "es") : a.name.localeCompare(b.name, "es"),
  );
  return (Object.keys(buckets) as SectionKey[])
    .filter((key) => buckets[key].length > 0)
    .map((key) => ({ key, label: SECTION_LABELS[key], options: buckets[key] }));
}

/** Proveedores presentes en las opciones, para ofrecer el filtro solo si hay más de uno. */
export function optionProviders(options: ModelOption[]): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const option of options) if (!seen.has(option.provider)) seen.set(option.provider, option.providerLabel);
  return [...seen.entries()].map(([id, label]) => ({ id, label }));
}

/** Nombre accesible completo: lo que se ve en dos líneas, dicho de corrido. */
export function optionAccessibleName(option: ModelOption): string {
  const context = formatContext(option.facts.context);
  return [
    option.name,
    option.favorite ? "favorito" : null,
    option.providerLabel,
    priceDescription(option.facts),
    context ? `${context} de contexto` : null,
    option.usage.length > 0 ? `en uso en ${usageSummary(option.usage)}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}
