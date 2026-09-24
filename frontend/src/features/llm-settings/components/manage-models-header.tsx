import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { DialogDescription, DialogTitle } from "@/core/components/ui/dialog";

interface ManageModelsHeaderProps {
  isAdmin: boolean;
  onConnect: () => void;
}

export function ManageModelsHeader({ isAdmin, onConnect }: Readonly<ManageModelsHeaderProps>) {
  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-border px-5 pt-5 pb-4 pr-14 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <DialogTitle>Catálogo de modelos</DialogTitle>
        <DialogDescription className="max-w-[62ch] text-pretty">
          Marca tus favoritos con la estrella{" "}
          <Icon name="star" weight="fill" size="text-xs" className="-mt-0.5 text-accent-brand" />: salen primero
          cuando eliges el modelo de una tarea.
          {isAdmin ? null : " Los que eliges con tu clave se añaden solos."}{" "}
          <span className="max-sm:hidden">Precios en USD por millón de tokens.</span>
        </DialogDescription>
      </div>
      <Button variant="outline" onClick={onConnect} className="shrink-0 max-sm:h-11 max-sm:self-start">
        <Icon name="plus" size="text-sm" />
        Conectar proveedor
      </Button>
    </div>
  );
}
