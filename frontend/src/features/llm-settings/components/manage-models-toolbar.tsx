import type { CatalogBrowser } from "../hooks/use-catalog-browser";
import { CATALOG_SORTS, type CatalogSort } from "../lib/catalog-browse";
import { CatalogChips } from "./catalog-chips";
import { CatalogResultCount } from "./catalog-result-count";
import { ManageModelsSearchField } from "./manage-models-search-field";
import { ManageModelsSelect } from "./manage-models-select";

interface ManageModelsToolbarProps {
  browser: CatalogBrowser;
  total: number;
}

const ALL_PROVIDERS = "all";

/** Búsqueda, proveedor y orden en una fila; los filtros rápidos, debajo. */
export function ManageModelsToolbar({ browser, total }: Readonly<ManageModelsToolbarProps>) {
  const { filters, setFilters } = browser;
  const showProviders = browser.providers.length > 1;
  return (
    <div className="shrink-0 space-y-2.5 border-b border-border px-5 py-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <ManageModelsSearchField
          value={filters.query}
          onSearch={(query) => {
            setFilters({ query });
          }}
        />
        <div className="grid grid-cols-1 gap-2 sm:flex sm:shrink-0">
          {showProviders ? (
            <ManageModelsSelect
              value={filters.provider ?? ALL_PROVIDERS}
              label="Filtrar por proveedor"
              className="sm:w-48"
              options={[
                { value: ALL_PROVIDERS, label: "Todos los proveedores" },
                ...browser.providers.map((p) => ({ value: p.id, label: p.label })),
              ]}
              onChange={(value) => {
                setFilters({ provider: value === ALL_PROVIDERS ? null : value });
              }}
            />
          ) : null}
          <ManageModelsSelect
            value={filters.sort}
            label="Ordenar"
            className="sm:w-56"
            options={CATALOG_SORTS.map((opt) => ({ value: opt.key, label: opt.label }))}
            onChange={(value) => {
              setFilters({ sort: value as CatalogSort });
            }}
          />
        </div>
      </div>
      <CatalogChips browser={browser} />
      <CatalogResultCount shown={browser.results.length} total={total} filtered={browser.filtered} onClear={browser.clear} />
    </div>
  );
}
