import { useState } from "react";

import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";

import { formatRoleName } from "../lib/role-utils";
import type { Role } from "../lib/types";
import { DeleteRoleBody } from "./delete-role-body";
import { FormErrorAlert } from "./form-error-alert";

function confirmLabel(needsReassign: boolean, isDeleting: boolean): string {
  if (isDeleting) return "Eliminando…";
  return needsReassign ? "Reasignar y eliminar" : "Eliminar rol";
}

interface DeleteRoleModalProps {
  role: Role;
  roles: Role[];
  isDeleting: boolean;
  serverError: string;
  onConfirm: (reassignRoleId?: string) => void;
  onCancel: () => void;
}

export function DeleteRoleModal({
  role,
  roles,
  isDeleting,
  serverError,
  onConfirm,
  onCancel,
}: Readonly<DeleteRoleModalProps>) {
  const [reassignRoleId, setReassignRoleId] = useState("");
  const [tried, setTried] = useState(false);
  const needsReassign = (role.user_count ?? 0) > 0;
  const missingTarget = needsReassign && reassignRoleId === "";

  // El botón no se deshabilita en silencio: si falta el rol de destino, se dice junto al selector.
  const handleConfirm = () => {
    setTried(true);
    if (missingTarget) {
      document.getElementById("reassign-role-select")?.focus();
      return;
    }
    onConfirm(needsReassign ? reassignRoleId : undefined);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isDeleting) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-lg" aria-describedby="delete-role-desc">
        <DialogHeader>
          <DialogTitle>¿Eliminar el rol «{formatRoleName(role.name)}»?</DialogTitle>
        </DialogHeader>
        <DeleteRoleBody
          role={role}
          roles={roles}
          reassignRoleId={reassignRoleId}
          reassignError={tried && missingTarget ? "Elige a qué rol pasarán sus usuarios." : ""}
          isDeleting={isDeleting}
          onReassignChange={setReassignRoleId}
        />
        <FormErrorAlert message={serverError} />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={isDeleting}
            onClick={handleConfirm}
          >
            {confirmLabel(needsReassign, isDeleting)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
