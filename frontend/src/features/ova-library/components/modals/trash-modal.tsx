import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";

import type { OvaListItem } from "../../lib/types";

interface TrashModalProps {
  ova: OvaListItem;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal de confirmación para enviar un OVA individual a la papelera. */
export function TrashModal({
  ova,
  isLoading = false,
  onConfirm,
  onCancel,
}: Readonly<TrashModalProps>) {
  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) {
      onCancel();
    }
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm" showCloseButton={!isLoading}>
        <DialogHeader>
          <DialogTitle>Mover a la papelera</DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block text-sm text-muted-foreground">
              ¿Mover a la papelera &quot;{ova.title ?? "OVA"}&quot;?
            </span>
            <span className="block text-xs text-muted-foreground">
              Podrás restaurarlo desde la sección Papelera.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={onConfirm}
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? "Moviendo..." : "Mover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
