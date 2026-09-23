import type { ReactNode } from "react";

import { cn } from "@/core/lib/cn";

interface Props {
  /** Texto de estado o ayuda a la izquierda (arriba en móvil). */
  status?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Pie estándar de los modales: estado a la izquierda, «Cancelar» + acción principal a la derecha. */
export function ModalActions({ status, children, className }: Readonly<Props>) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0 text-sm text-muted-foreground">{status}</div>
      <div className="flex shrink-0 gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{children}</div>
    </div>
  );
}
