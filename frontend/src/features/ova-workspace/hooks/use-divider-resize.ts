import type { RefObject } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

interface Params {
  container: RefObject<HTMLDivElement | null>;
  ratio: number;
  onChange: (ratio: number) => void;
}

/**
 * Props de interacción del separador redimensionable. Un `separator`
 * redimensionable es enfocable según WAI-ARIA; los handlers van en un hook
 * porque el elemento es presentacional por defecto para el árbol accesible.
 */
export function useDividerResize({ container, ratio, onChange }: Readonly<Params>) {
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.buttons !== 1) return;
    const bounds = container.current?.getBoundingClientRect();
    if (bounds?.width) onChange(((event.clientX - bounds.left) / bounds.width) * 100);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    onChange(ratio + (event.key === "ArrowLeft" ? -5 : 5));
  };
  return { "aria-orientation": "vertical" as const, onKeyDown, onPointerDown, onPointerMove, tabIndex: 0 };
}
