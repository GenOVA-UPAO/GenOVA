import { firstNonBlank } from "@/core/lib/text";

import { sortModels } from "./catalog-sort";
import { PROVIDER_LABELS } from "./llm-catalog.utils";
import { type Capability, isCheap, modelFacts, sortPrice } from "./model-facts";
import type { CatalogModel } from "./user-llm-settings.types";

/**
 * Filtros y orden del catálogo, en el navegador: el catálogo llega entero (unos
 * 460 modelos) y así la búsqueda responde al teclear, sin ir al servidor.
 *
 * Lógica pura: se prueba en catalog-browse.spec.ts.
 */

export type CatalogSort = "recommended" | "price-asc" | "price-desc" | "context-desc" | "name-asc";

export const CATALOG_SORTS: { key: CatalogSort; label: string }[] = [
  { key: "recommended", label: "En uso y favoritos primero" },
  { key: "price-asc", label: "Más baratos primero" },
  { key: "price-desc", label: "Más caros primero" },
  { key: "context-desc", label: "Más contexto primero" },
  { key: "name-asc", label: "Nombre (A-Z)" },
];

export interface CatalogFilters {
  query: string;
  favorites: boolean;
  free: boolean;
  cheap: boolean;
  recommended: boolean;
  capabilities: Capability[];
  /** `null` = todos. */
  provider: string | null;
  sort: CatalogSort;
}

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  query: "",
  favorites: false,
  free: false,
  cheap: false,
  recommended: false,
  capabilities: [],
  provider: null,
  sort: "recommended",
};

/** Si hay algo que quitar (el orden no cuenta como filtro). */
export function catalogFiltered(filters: CatalogFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.favorites ||
    filters.free ||
    filters.cheap ||
    filters.recommended ||
    filters.capabilities.length > 0 ||
    filters.provider !== null
  );
}

type IsFavorite = (model: CatalogModel) => boolean;
type IsInUse = (model: CatalogModel) => boolean;

function haystack(model: CatalogModel): string {
  const provider = PROVIDER_LABELS[model.provider] ?? model.provider;
  return `${model.label ?? ""} ${model.model_id} ${provider} ${model.description ?? ""}`.toLowerCase();
}

function passesFacts(model: CatalogModel, filters: CatalogFilters): boolean {
  const facts = modelFacts(model);
  if (filters.free && !facts.free) return false;
  if (filters.cheap && !isCheap(facts)) return false;
  return filters.capabilities.every((cap) => facts.capabilities.includes(cap));
}

function passes(
  model: CatalogModel,
  filters: CatalogFilters,
  words: string[],
  isFavorite: IsFavorite,
): boolean {
  if (filters.provider !== null && model.provider !== filters.provider) return false;
  if (filters.favorites && !isFavorite(model)) return false;
  if (filters.recommended && model.curated !== true) return false;
  if (!passesFacts(model, filters)) return false;
  const text = words.length > 0 ? haystack(model) : "";
  return words.every((word) => text.includes(word));
}

const byName = (a: CatalogModel, b: CatalogModel) =>
  (firstNonBlank(a.label) ?? a.model_id).localeCompare(firstNonBlank(b.label) ?? b.model_id, "es");

/** En uso, favoritos, recomendados y el resto; dentro de cada grupo, por nombre. */
function sortRecommended(
  models: CatalogModel[],
  isFavorite: IsFavorite,
  isInUse: IsInUse,
): CatalogModel[] {
  const rank = (model: CatalogModel) => {
    if (isInUse(model)) return 0;
    if (isFavorite(model)) return 1;
    return model.curated ? 2 : 3;
  };
  return [...models].sort((a, b) => rank(a) - rank(b) || byName(a, b));
}

/**
 * Precio para ordenar: salida por millón de tokens, o lo que cuesta una imagen o
 * un segundo de video; lo gratis cuenta como 0 aunque no traiga el detalle.
 */
function outputPrice(model: CatalogModel): number | null {
  return sortPrice(modelFacts(model));
}

/** Por precio de salida; el desconocido (Variable, sin dato) siempre al final. */
function sortByPrice(models: CatalogModel[], sort: "price-asc" | "price-desc"): CatalogModel[] {
  return [...models].sort((a, b) => {
    const pa = outputPrice(a);
    const pb = outputPrice(b);
    if (pa === null || pb === null)
      return (pa === null ? 1 : 0) - (pb === null ? 1 : 0) || byName(a, b);
    return (sort === "price-asc" ? pa - pb : pb - pa) || byName(a, b);
  });
}

export function browseCatalog(
  models: readonly CatalogModel[],
  filters: CatalogFilters,
  isFavorite: IsFavorite,
  isInUse: IsInUse = () => false,
): CatalogModel[] {
  const words = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = models.filter((model) => passes(model, filters, words, isFavorite));
  if (filters.sort === "recommended") return sortRecommended(matches, isFavorite, isInUse);
  if (filters.sort === "price-asc" || filters.sort === "price-desc")
    return sortByPrice(matches, filters.sort);
  return sortModels(matches, filters.sort);
}

/** Proveedores presentes en el catálogo, con su nombre visible. */
export function catalogProviders(models: readonly CatalogModel[]): { id: string; label: string }[] {
  const ids = [...new Set(models.map((model) => model.provider).filter(Boolean))];
  return ids
    .map((id) => ({ id, label: PROVIDER_LABELS[id] ?? id }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}
