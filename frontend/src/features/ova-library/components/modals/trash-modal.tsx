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
  /** Dónde dejar el foco al cerrar (por defecto, lo decide Radix). */
  onCloseAutoFocus?: (event: Event) => void;
}

/** Confirmación para mover un OVA a la papelera (reversible desde Papelera). */
export function TrashModal({
  ova,
  isLoading = false,
  onConfirm,
  onCancel,
  onCloseAutoFocus,
}: Readonly<TrashModalProps>) {
  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) onCancel();
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!isLoading}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader className="pr-8">
          <DialogTitle>Mover a la papelera</DialogTitle>
          <DialogDescription>
            <span className="font-medium break-words text-foreground">«{ova.title ?? "OVA"}»</span>{" "}
            se moverá a la papelera. Podrás restaurarlo desde Papelera cuando quieras.
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
