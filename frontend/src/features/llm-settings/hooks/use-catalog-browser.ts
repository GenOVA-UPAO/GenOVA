import { useState } from "react";

import {
  browseCatalog,
  catalogFiltered,
  type CatalogFilters,
  catalogProviders,
  DEFAULT_CATALOG_FILTERS,
} from "../lib/catalog-browse";
import type { CatalogModel } from "../lib/user-llm-settings.types";

/** Filas del catálogo que se pintan de una vez; al bajar se pintan más. */
export const CATALOG_STEP = 60;

const modelKey = (provider: string, modelId: string) => `${provider}::${modelId}`;

/** Estado del catálogo: filtros, orden y cuántas filas se pintan. */
export function useCatalogBrowser(
  models: CatalogModel[],
  isFavorite: (model: CatalogModel) => boolean,
  isInUse: (model: CatalogModel) => boolean = () => false,
) {
  const [filters, setFiltersState] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);
  const [limit, setLimit] = useState(CATALOG_STEP);
  // Favoritos tal como estaban al ordenar: marcar o quitar uno no mueve su fila
  // (ni la saca de «Favoritos») hasta que cambian los filtros o se reabre.
  const [held, setHeld] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const rankedFavorite = (model: CatalogModel) =>
    held.get(modelKey(model.provider, model.model_id)) ?? isFavorite(model);
  const results = browseCatalog(models, filters, rankedFavorite, isInUse);

  const setFilters = (patch: Partial<CatalogFilters>) => {
    setFiltersState({ ...filters, ...patch });
    setLimit(CATALOG_STEP);
    setHeld(new Map());
  };

  return {
    filters,
    setFilters,
    clear: () => {
      setFiltersState({ ...DEFAULT_CATALOG_FILTERS, sort: filters.sort });
      setLimit(CATALOG_STEP);
      setHeld(new Map());
    },
    reset: () => {
      setFiltersState(DEFAULT_CATALOG_FILTERS);
      setLimit(CATALOG_STEP);
      setHeld(new Map());
    },
    /** Antes de marcar o quitar un favorito: la fila se queda donde está. */
    holdPlace: (model: CatalogModel) => {
      const key = modelKey(model.provider, model.model_id);
      if (held.has(key)) return;
      setHeld(new Map(held).set(key, isFavorite(model)));
    },
    filtered: catalogFiltered(filters),
    results,
    visible: results.slice(0, limit),
    providers: catalogProviders(models),
    favoritesCount: models.filter(isFavorite).length,
    showMore: () => {
      if (limit < results.length) setLimit(limit + CATALOG_STEP);
    },
  };
}

export type CatalogBrowser = ReturnType<typeof useCatalogBrowser>;
