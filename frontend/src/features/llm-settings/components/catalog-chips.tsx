import type { CatalogBrowser } from "../hooks/use-catalog-browser";
import { type Capability, CAPABILITY_LABELS, CHEAP_OUTPUT_MAX } from "../lib/model-facts";
import { FilterChip } from "./filter-chip";

const CAPS: Capability[] = ["vision", "reasoning", "code"];

/** Filtros rápidos: se combinan entre sí, con la búsqueda y con el proveedor. */
export function CatalogChips({ browser }: Readonly<{ browser: CatalogBrowser }>) {
  const { filters, setFilters } = browser;
  return (
    <div
      role="group"
      aria-label="Filtros rápidos"
      className="-mx-5 flex gap-1.5 overflow-x-auto px-5 py-1 [scrollbar-width:none] max-sm:py-2"
    >
      <FilterChip
        label={`Favoritos (${String(browser.favoritesCount)})`}
        pressed={filters.favorites}
        onClick={() => {
          setFilters({ favorites: !filters.favorites });
        }}
      />
      <FilterChip
        label="Gratis"
        pressed={filters.free}
        onClick={() => {
          setFilters({ free: !filters.free });
        }}
      />
      <FilterChip
        label="Económicos"
        title={`Salida a $${String(CHEAP_OUTPUT_MAX)} o menos por millón de tokens`}
        pressed={filters.cheap}
        onClick={() => {
          setFilters({ cheap: !filters.cheap });
        }}
      />
      {CAPS.map((cap) => (
        <FilterChip
          key={cap}
          label={CAPABILITY_LABELS[cap]}
          pressed={filters.capabilities.includes(cap)}
          onClick={() => {
            const has = filters.capabilities.includes(cap);
            setFilters({
              capabilities: has
                ? filters.capabilities.filter((c) => c !== cap)
                : [...filters.capabilities, cap],
            });
          }}
        />
      ))}
      <FilterChip
        label="Recomendados"
        title="Seleccionados por GenOVA para generar OVAs"
        pressed={filters.recommended}
        onClick={() => {
          setFilters({ recommended: !filters.recommended });
        }}
      />
    </div>
  );
}
