import { Icon } from "@/core/components/icon";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/core/components/ui/sheet";

import { NavbarBrand } from "./brand";
import { SidebarMenu } from "./sidebar-menu";

interface MobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileDrawer({ open, onOpenChange }: Readonly<MobileDrawerProps>) {
  const close = () => {
    onOpenChange(false);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
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
