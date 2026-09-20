import type { CatalogModel, LlmSettingsResponse } from "./user-llm-settings.types";

/**
 * El catálogo curado puede traer la misma pareja proveedor/modelo repetida
 * (p. ej. DeepSeek V4 Flash listado como `codigo` y como `texto`), y eso
 * pintaba dos <option> idénticas en los selects de tareas. Se queda la primera
 * aparición, que es la que el backend devuelve con más detalle.
 */
export function dedupeCatalogModels(models: CatalogModel[]): CatalogModel[] {
  const seen = new Set<string>();
  const out: CatalogModel[] = [];
  for (const model of models) {
    const key = `${model.provider}::${model.model_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(model);
  }
  return out;
}

export function dedupeCatalogMap(
  catalog: Record<string, CatalogModel[]>,
): Record<string, CatalogModel[]> {
  const out: Record<string, CatalogModel[]> = {};
  for (const [provider, models] of Object.entries(catalog)) {
    out[provider] = Array.isArray(models) ? dedupeCatalogModels(models) : [];
  }
  return out;
}

export function dedupeCatalogPage(page: LlmSettingsResponse): LlmSettingsResponse {
  return {
    ...page,
    catalog: page.catalog ? dedupeCatalogMap(page.catalog) : page.catalog,
    catalog_all: page.catalog_all ? dedupeCatalogModels(page.catalog_all) : page.catalog_all,
    catalog_full: page.catalog_full ? dedupeCatalogModels(page.catalog_full) : page.catalog_full,
  };
}
