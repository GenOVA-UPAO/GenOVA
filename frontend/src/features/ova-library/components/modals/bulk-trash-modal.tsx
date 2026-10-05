import i18n from "i18next";
import { useTranslation } from "react-i18next";

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
  useTranslation();
  const handleOpenChange = (open: boolean) => {
    if (!open && !isLoading) onCancel();
  };
  const noun = `${String(count)} ${ovaNoun(count)}`;

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isLoading}>
        <DialogHeader className="pr-8">
          <DialogTitle>
            {i18n.t("ova-library:mover")} {noun} {i18n.t("ova-library:a_la_papelera")}
          </DialogTitle>
          <DialogDescription>
            {count === 1
              ? i18n.t("ova-library:podras_restaurarlo_desde_papelera_cuando_quieras")
              : i18n.t("ova-library:podras_restaurarlos_desde_papelera_cuando_quieras")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {i18n.t("ova-library:cancelar")}{" "}
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={isLoading}>
            {isLoading ? i18n.t("ova-library:moviendo") : i18n.t("ova-library:mover_a_la_papelera")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
