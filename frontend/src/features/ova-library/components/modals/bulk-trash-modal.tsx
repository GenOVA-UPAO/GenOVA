import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";

import { ovaNoun } from "../../lib/ova-count";

interface BulkTrashModalProps {
  count: number;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal de confirmación para mover múltiples OVAs seleccionados a la papelera. */
export function BulkTrashModal({
  count,
  isLoading = false,
  onConfirm,
  onCancel,
}: Readonly<BulkTrashModalProps>) {
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
              ¿Mover{" "}
              <span className="font-semibold text-foreground">
                {count} {ovaNoun(count)}
              </span>{" "}
              a la papelera?
            </span>
            <span className="block text-xs text-muted-foreground">
              Podrás restaurarlos desde la sección Papelera.
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
            {isLoading ? "Moviendo..." : `Mover ${String(count)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
