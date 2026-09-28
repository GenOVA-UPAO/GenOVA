import { useState } from "react";

import { pruneSelection, type ResourceVM } from "../lib/ova-job-view-model";

/** Selección de recursos fallidos para reintentos agrupados en el progreso. */
export function useFailedSelection(viewModel: ResourceVM[]) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };
  const selectAll = () => {
    setSelected(viewModel.filter((resource) => resource.selectable).map((resource) => resource.id));
  };
  return { selected: pruneSelection(selected, viewModel), toggle, selectAll, reset: () => { setSelected([]); } };

}
