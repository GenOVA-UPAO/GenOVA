import type { ReactNode } from "react";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/core/components/ui/dialog";

/** Ancho del diálogo según la densidad del contenido, no según quién lo abre. */
const WIDTH = {
  sm: "sm:max-w-md",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-3xl",
  xl: "sm:max-w-5xl",
} as const;

interface Props {
  title: string;
  /** Frase corta bajo el título. Sustituye al `sr-only` cuando se pasa. */
  description?: string;
  size?: keyof typeof WIDTH;
  /**
   * Barra de acciones fija al pie, fuera del área que hace scroll. Convención:
   * «Cancelar» (outline) justo antes de la única acción principal, a la derecha.
   */
  footer?: ReactNode;
  children: ReactNode;
  onClose: () => void;
}

export function WorkspaceModal({ title, description, size = "xl", footer, children, onClose }: Readonly<Props>) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className={`flex max-h-[90vh] flex-col overflow-hidden gap-0 ${WIDTH[size]}`}>
        <header className="shrink-0 space-y-1 pr-8 pb-4">
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">{children}</div>
        {footer ? <footer className="mt-4 shrink-0 border-t border-border pt-4">{footer}</footer> : null}
      </DialogContent>
    </Dialog>
  );
}
