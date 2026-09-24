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

/** Estado del catálogo: filtros, orden y cuántas filas se pintan. */
export function useCatalogBrowser(
  models: CatalogModel[],
  isFavorite: (model: CatalogModel) => boolean,
  isInUse: (model: CatalogModel) => boolean = () => false,
) {
  const [filters, setFiltersState] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);
  const [limit, setLimit] = useState(CATALOG_STEP);
  const results = browseCatalog(models, filters, isFavorite, isInUse);

  const setFilters = (patch: Partial<CatalogFilters>) => {
    setFiltersState({ ...filters, ...patch });
    setLimit(CATALOG_STEP);
  };

  return {
    filters,
    setFilters,
    clear: () => {
      setFiltersState({ ...DEFAULT_CATALOG_FILTERS, sort: filters.sort });
      setLimit(CATALOG_STEP);
    },
    reset: () => {
      setFiltersState(DEFAULT_CATALOG_FILTERS);
      setLimit(CATALOG_STEP);
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
