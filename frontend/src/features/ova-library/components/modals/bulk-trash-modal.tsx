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

/** Confirmación para mover a la papelera los OVAs seleccionados. */
export function BulkTrashModal({
  count,
  isLoading = false,
  onConfirm,
  onCancel,
}: Readonly<BulkTrashModalProps>) {
  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) onCancel();
  };
  const noun = `${String(count)} ${ovaNoun(count)}`;

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isLoading}>
        <DialogHeader className="pr-8">
          <DialogTitle>Mover {noun} a la papelera</DialogTitle>
          <DialogDescription>
            {count === 1
              ? "Podrás restaurarlo desde Papelera cuando quieras."
              : "Podrás restaurarlos desde Papelera cuando quieras."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={isLoading}>
            {isLoading ? "Moviendo..." : "Mover a la papelera"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
