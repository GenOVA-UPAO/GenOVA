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
  const { t } = useTranslation();
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
          <DialogTitle>{t("ova-library:mover_a_la_papelera")}</DialogTitle>
          <DialogDescription>
            <span className="font-medium break-words text-foreground">«{ova.title ?? "OVA"}»</span>{" "}
            {t(
              "ova-library:se_movera_a_la_papelera_podras_restaurarlo_desde_papelera_cuando_quieras",
            )}{" "}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            {t("ova-library:cancelar")}{" "}
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={isLoading}>
            {isLoading ? t("ova-library:moviendo") : t("ova-library:mover_a_la_papelera")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
