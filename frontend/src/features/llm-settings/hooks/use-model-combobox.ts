import { type KeyboardEvent, useState } from "react";

import { filterOptions, type ModelOption } from "../lib/model-search";

/** Estado del selector de modelos con búsqueda: abierto, consulta y opción activa. */
export function useModelCombobox(
  options: ModelOption[],
  current: string,
  onPick: (value: string) => void,
) {
  const [open, setOpenState] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const { visible, total } = filterOptions(options, query);

  const setOpen = (next: boolean) => {
    setOpenState(next);
    setQuery("");
    // Al abrir, la opción activa es la elegida (si está entre las visibles).
    const index = filterOptions(options, "").visible.findIndex((o) => o.value === current);
    setActive(next ? Math.max(index, 0) : 0);
  };

  const pick = (value: string) => {
    onPick(value);
    setOpen(false);
  };

  const onQuery = (next: string) => {
    setQuery(next);
    setActive(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = Math.max(visible.length - 1, 0);
    const moves: Partial<Record<string, number>> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
    };
    const move = moves[event.key];
    if (move !== undefined) {
      event.preventDefault();
      setActive(move);
      return;
    }
    if (event.key === "Enter" && active < visible.length) {
      event.preventDefault();
      pick(visible[active].value);
    }
  };

  return { open, setOpen, query, onQuery, active, setActive, visible, total, pick, onKeyDown };
}
