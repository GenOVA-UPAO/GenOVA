import { useState } from "react";

/** Selección múltiple sobre los ids visibles de una página de OVAs. */
export function useOvaSelection(selectableIds: readonly string[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const remove = (id: string) => {
    setSelectedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };
  const clear = () => { setSelectedIds(new Set()); };
  const selectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(selectableIds) : new Set());
  };
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  return { selectedIds, toggle, remove, clear, selectAll, allSelected };
}
