import { useTranslation } from "react-i18next";

import type { CatalogBrowser } from "../hooks/use-catalog-browser";
import { type Capability, CAPABILITY_LABELS, CHEAP_OUTPUT_MAX } from "../lib/model-facts";
import { FilterChip } from "./filter-chip";

const CAPS: Capability[] = ["vision", "reasoning", "code"];

/** Filtros rápidos: se combinan entre sí, con la búsqueda y con el proveedor. */
export function CatalogChips({ browser }: Readonly<{ browser: CatalogBrowser }>) {
  const { t } = useTranslation("llm-settings");
  const { filters, setFilters } = browser;
  return (
    <div
      role="group"
      aria-label={t("catalog.quickFilters")}
      className="-mx-5 flex gap-1.5 overflow-x-auto px-5 py-1 [scrollbar-width:none] max-sm:py-2"
    >
      <FilterChip
        label={`${t("sections.favorites")} (${String(browser.favoritesCount)})`}
        pressed={filters.favorites}
        onClick={() => {
          setFilters({ favorites: !filters.favorites });
        }}
      />
      <FilterChip
        label={t("catalog.free")}
        pressed={filters.free}
        onClick={() => {
          setFilters({ free: !filters.free });
        }}
      />
      <FilterChip
        label={t("catalog.budget")}
        title={t("catalog.budgetHint", { price: `$${String(CHEAP_OUTPUT_MAX)}` })}
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
        label={t("sections.recommended")}
        title={t("catalog.recommendedDesc")}
        pressed={filters.recommended}
        onClick={() => {
          setFilters({ recommended: !filters.recommended });
        }}
      />
    </div>
  );
}
