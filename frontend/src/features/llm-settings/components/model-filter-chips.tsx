import { useTranslation } from "react-i18next";

import { cn } from "@/core/lib/cn";

import { CHEAP_IMAGE_MAX, CHEAP_VIDEO_SECOND_MAX } from "../lib/media-price";
import { type Capability, CAPABILITY_LABELS, CHEAP_OUTPUT_MAX } from "../lib/model-facts";
import type { PickerFilters } from "../lib/model-search";
import { FilterChip } from "./filter-chip";

interface ModelFilterChipsProps {
  filters: PickerFilters;
  providers: { id: string; label: string }[];
  onChange: (next: PickerFilters) => void;
  className?: string;
  /** Solo modelos de imagen o video: sin filtros de capacidades de texto. */
  mediaOnly?: boolean;
}

const CAPS: Capability[] = ["vision", "reasoning", "code"];

/** Filtros rápidos del selector: se combinan entre sí y con la búsqueda. */
export function ModelFilterChips({
  filters,
  providers,
  onChange,
  className,
  mediaOnly = false,
}: Readonly<ModelFilterChipsProps>) {
  const { t } = useTranslation("llm-settings");

  const toggleCap = (cap: Capability) => {
    const has = filters.capabilities.includes(cap);
    onChange({
      ...filters,
      capabilities: has
        ? filters.capabilities.filter((c) => c !== cap)
        : [...filters.capabilities, cap],
    });
  };
  return (
    <div
      role="group"
      aria-label={t("catalog.quickFilters")}
      className={cn(
        "flex gap-1.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none]",
        className,
      )}
    >
      <FilterChip
        label={t("catalog.free")}
        pressed={filters.free}
        onClick={() => {
          onChange({ ...filters, free: !filters.free });
        }}
      />
      <FilterChip
        label={t("catalog.budget")}
        title={
          mediaOnly
            ? t("facts.cheapMediaTitle", { image: CHEAP_IMAGE_MAX, video: CHEAP_VIDEO_SECOND_MAX })
            : t("facts.cheapTokensTitle", { price: CHEAP_OUTPUT_MAX })
        }
        pressed={filters.cheap}
        onClick={() => {
          onChange({ ...filters, cheap: !filters.cheap });
        }}
      />
      {(mediaOnly ? [] : CAPS).map((cap) => (
        <FilterChip
          key={cap}
          label={CAPABILITY_LABELS[cap]}
          pressed={filters.capabilities.includes(cap)}
          onClick={() => {
            toggleCap(cap);
          }}
        />
      ))}
      {providers.length > 1
        ? providers.map((provider) => (
            <FilterChip
              key={provider.id}
              label={provider.label}
              pressed={filters.provider === provider.id}
              onClick={() => {
                onChange({
                  ...filters,
                  provider: filters.provider === provider.id ? null : provider.id,
                });
              }}
            />
          ))
        : null}
    </div>
  );
}
