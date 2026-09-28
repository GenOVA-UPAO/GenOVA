import { type KeyboardEvent, useState } from "react";

import {
  filterOptions,
  type ModelOption,
  NO_FILTERS,
  type PickerFilters,
  sectionOptions,
} from "../lib/model-search";

/** Filas que se pintan de una vez; al acercarse al final se pintan más. */
export const RENDER_STEP = 50;
const PAGE_JUMP = 8;

function nextActive(key: string, active: number, last: number): number | undefined {
  const moves: Partial<Record<string, number>> = {
    ArrowDown: Math.min(active + 1, last),
    ArrowUp: Math.max(active - 1, 0),
    PageDown: Math.min(active + PAGE_JUMP, last),
    PageUp: Math.max(active - PAGE_JUMP, 0),
    Home: 0,
    End: last,
  };
  return moves[key];
}

/** Estado del selector de modelos: abierto, búsqueda, filtros, opción activa y cuántas filas se pintan. */
export function useModelCombobox(
  options: ModelOption[],
  current: string,
  onPick: (value: string) => void,
) {
  const [open, setOpenState] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFiltersState] = useState<PickerFilters>(NO_FILTERS);
  const [active, setActiveState] = useState(0);
  const [limit, setLimit] = useState(RENDER_STEP);
  const matches = filterOptions(options, query, filters);
  const sections = sectionOptions(matches, current, filters.cheap || filters.free);
  const flat = sections.flatMap((section) => section.options);

  const setActive = (index: number) => {
    setActiveState(index);
    // Con el teclado se puede bajar más allá de lo pintado: se pinta hasta ahí.
    if (index >= limit - 5) setLimit(index + RENDER_STEP);
  };

  const reset = () => {
    setActiveState(0);
    setLimit(RENDER_STEP);
  };

  const setOpen = (next: boolean) => {
    setOpenState(next);
    setQuery("");
    setFiltersState(NO_FILTERS);
    reset();
  };

  const pick = (value: string) => {
    onPick(value);
    setOpen(false);
  };

  const onQuery = (next: string) => {
    setQuery(next);
    reset();
  };

  const setFilters = (next: PickerFilters) => {
    setFiltersState(next);
    reset();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const move = nextActive(event.key, active, Math.max(flat.length - 1, 0));
    if (move !== undefined) {
      event.preventDefault();
      setActive(move);
      return;
    }
    if (event.key === "Enter" && active < flat.length) {
      event.preventDefault();
      pick(flat[active].value);
    }
  };

  return {
    open,
    setOpen,
    query,
    onQuery,
    filters,
    setFilters,
    active,
    setActive,
    sections,
    flat,
    total: options.length,
    limit,
    showMore: () => {
      if (limit < flat.length) setLimit(limit + RENDER_STEP);
    },
    pick,
    onKeyDown,
  };
}

export type ComboboxState = ReturnType<typeof useModelCombobox>;
