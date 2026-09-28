import { useState } from "react";

import { Icon } from "@/core/components/icon";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/core/components/ui/sheet";

import { NavbarBrand } from "./brand";
import { SidebarMenu } from "./sidebar-menu";

/**
 * Botón «Abrir menú» y el menú lateral en móvil. El botón es el Trigger del
 * Sheet para que, al cerrar, el foco vuelva a él y no se pierda en <body>.
 */
export function MobileDrawer() {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="-ml-1 inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 md:hidden"
        aria-label="Abrir menú"
      >
        <Icon name="list" size="text-xl" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="bg-sidebar md:hidden"
        overlayClassName="md:hidden"
        aria-describedby={undefined}
      >
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
          <NavbarBrand />
          <SheetClose
            className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Cerrar menú"
          >
            <Icon name="x" size="text-xl" />
          </SheetClose>
        </div>
        <SidebarMenu onNavigate={close} />
      </SheetContent>
    </Sheet>
  );
}
