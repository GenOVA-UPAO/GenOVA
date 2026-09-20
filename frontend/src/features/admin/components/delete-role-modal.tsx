import { useState } from "react";

import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";

import type { Role } from "../lib/types";
import { DeleteRoleBody } from "./delete-role-body";
import { FormErrorAlert } from "./form-error-alert";

function confirmLabel(needsReassign: boolean, isDeleting: boolean): string {
  if (isDeleting) return "Eliminando...";
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
  const needsReassign = (role.user_count ?? 0) > 0;
  const confirmDisabled = isDeleting || (needsReassign && reassignRoleId === "");

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isDeleting) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            ¿Eliminar rol: <span className="capitalize">{role.name}</span>?
          </DialogTitle>
        </DialogHeader>
        <DeleteRoleBody
          role={role}
          roles={roles}
          reassignRoleId={reassignRoleId}
          isDeleting={isDeleting}
          onReassignChange={setReassignRoleId}
        />
        <FormErrorAlert message={serverError} />
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            disabled={confirmDisabled}
            onClick={() => {
              onConfirm(needsReassign ? reassignRoleId : undefined);
            }}
          >
            {confirmLabel(needsReassign, isDeleting)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
