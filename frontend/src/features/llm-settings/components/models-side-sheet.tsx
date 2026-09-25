import type { ReactNode } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { useReturnFocus } from "@/core/components/ui/return-focus";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/core/components/ui/sheet";

interface ModelsSideSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Acción principal del panel, bajo el título (p. ej. «Guardar la configuración actual»). */
  action?: ReactNode;
  children: ReactNode;
}

/** Panel lateral derecho de Perfiles e Historial: cabecera fija y lista con scroll. */
export function ModelsSideSheet({
  open,
  onOpenChange,
  title,
  description,
  action,
  children,
}: Readonly<ModelsSideSheetProps>) {
  // Al cerrarse, el foco vuelve al botón que lo abrió («Perfiles», «Historial»).
  const returnFocus = useReturnFocus({});
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-full sm:w-[28rem] sm:max-w-[28rem]"
        {...returnFocus}
        onEscapeKeyDown={(event) => {
          // Un campo que usa Esc para cancelar (renombrar un perfil) no cierra el panel.
          if (event.target instanceof Element && event.target.closest("[data-local-escape]")) {
            event.preventDefault();
          }
        }}
      >
        <div className="space-y-3 border-b border-border px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1 space-y-1">
              <SheetTitle className="font-display text-xl font-semibold">{title}</SheetTitle>
              <SheetDescription>{description}</SheetDescription>
            </div>
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mt-1 -mr-2 max-sm:size-11"
                aria-label="Cerrar"
              >
                <Icon name="x" size="text-base" />
              </Button>
            </SheetClose>
          </div>
          {action}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
