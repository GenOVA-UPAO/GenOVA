import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { DialogDescription, DialogTitle } from "@/core/components/ui/dialog";

export function ManageModelsHeader({ onConnect }: Readonly<{ onConnect: () => void }>) {
  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-border px-5 pt-5 pb-4 pr-14 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <DialogTitle>Gestionar modelos</DialogTitle>
        <DialogDescription>
          Los modelos que actives aparecen en las listas de la pestaña Modelos.
        </DialogDescription>
      </div>
      <Button variant="outline" onClick={onConnect} className="shrink-0 max-sm:h-11">
        <Icon name="plus" size="text-sm" />
        Conectar proveedor
      </Button>
    </div>
  );
}
