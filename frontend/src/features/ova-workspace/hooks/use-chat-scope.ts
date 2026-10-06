import { useState } from "react";

import type { PhaseWithContent } from "../lib/types";

/**
 * Alcance de la instrucción del chat. Regenerar crea una versión con ids nuevos:
 * la selección solo cuenta los recursos que siguen existiendo. Persiste al cerrar
 * el desplegable (solo «Quitar selección» vuelve al OVA entero): si no, la
 * etiqueta decía «todo el OVA» con casillas marcadas y se aplicaba a todo.
 */
export function useChatScope(phases: PhaseWithContent[]) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const live = selected.filter((id) => phases.some((phase) => phase.id === id));
  return {
    selecting,
    live,
    toggleOpen: () => { setSelecting(!selecting); },
    toggle: (id: string) => { setSelected(live.includes(id) ? live.filter((v) => v !== id) : [...live, id]); },
    selectAll: () => { setSelected(phases.map((phase) => phase.id)); },
    clear: () => { setSelected([]); },
  };
}
