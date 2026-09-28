import type { DragEvent } from "react";
import { useState } from "react";

import { applyReorder } from "../lib/resource-reorder";
import type { PhaseWithContent } from "../lib/types";

/**
 * Reordenar arrastrando: los handlers van en un hook y se aplican con spread
 * sobre el <li>; los botones Subir/Bajar cubren el acceso por teclado.
 */
export function usePhaseDrag(phases: PhaseWithContent[], onReorder: (next: PhaseWithContent[]) => void) {
  const [from, setFrom] = useState<number | null>(null);
  const start = (event: DragEvent<HTMLLIElement>, index: number) => {
    setFrom(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  };
  const over = (event: DragEvent<HTMLLIElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };
  const drop = (event: DragEvent<HTMLLIElement>, toIndex: number) => {
    event.preventDefault();
    const origin = from;
    setFrom(null);
    if (origin === null || origin === toIndex) return;
    onReorder(applyReorder(phases, origin, toIndex));
  };
  return {
    dragging: from,
    liProps: (index: number) => ({
      draggable: true,
      onDragStart: (event: DragEvent<HTMLLIElement>) => {
        start(event, index);
      },
      onDragOver: (event: DragEvent<HTMLLIElement>) => {
        over(event);
      },
      onDrop: (event: DragEvent<HTMLLIElement>) => {
        drop(event, index);
      },
      onDragEnd: () => {
        setFrom(null);
      },
    }),
  };
}
