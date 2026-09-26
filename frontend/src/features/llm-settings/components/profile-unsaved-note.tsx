import type { ReactNode } from "react";

import { Icon } from "@/core/components/icon";

/** Aviso de que hay cambios sin guardar en la página que la acción no tiene en cuenta. */
export function UnsavedNote({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
      <Icon name="warning" size="text-base" className="mt-0.5 shrink-0 text-accent-brand" />
      <span>{children}</span>
    </p>
  );
}
