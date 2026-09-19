import type { RefObject } from "react";

import { useDividerResize } from "../../hooks/use-divider-resize";

interface Props {
  container: RefObject<HTMLDivElement | null>;
  ratio: number;
  onChange: (ratio: number) => void;
}
export function WorkspaceResizableDivider({ container, ratio, onChange }: Readonly<Props>) {
  const resize = useDividerResize({ container, ratio, onChange });
  return (
    <div
      role="separator"
      aria-label="Ancho del panel de chat"
      aria-valuemin={25}
      aria-valuemax={65}
      aria-valuenow={ratio}
      className="hidden cursor-col-resize touch-none bg-border/40 hover:bg-primary/30 focus-visible:bg-primary/30 md:block"
      {...resize}
    />
  );
}
