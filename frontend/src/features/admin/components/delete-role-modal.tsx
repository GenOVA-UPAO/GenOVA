import { useState } from "react";
import { useTranslation } from "react-i18next";

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

interface DeleteRoleModalProps {
  role: Role;
  roles: Role[];
  isDeleting: boolean;
  serverError: string;
  onConfirm: (reassignRoleId?: string) => void;
  onCancel: () => void;
}

function resolveConfirmText(isDeleting: boolean, needsReassign: boolean, t: (key: string) => string): string {
  if (isDeleting) {
    return t("roles.deleteModal.deleting");
  }
  if (needsReassign) {
    return t("roles.deleteModal.reassignAndConfirm");
  }
  return t("roles.deleteModal.confirm");
}

export function DeleteRoleModal({
  role,
  roles,
  isDeleting,
  serverError,
  onConfirm,
  onCancel,
}: Readonly<DeleteRoleModalProps>) {
  const { t } = useTranslation("admin");
  const [reassignRoleId, setReassignRoleId] = useState("");
  const [tried, setTried] = useState(false);
  const needsReassign = (role.user_count ?? 0) > 0;
  const missingTarget = needsReassign && reassignRoleId === "";
  const confirmText = resolveConfirmText(isDeleting, needsReassign, t);


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
          <DialogTitle>
            {t("roles.deleteModal.title", { name: formatRoleName(role.name) })}
          </DialogTitle>
        </DialogHeader>
        <DeleteRoleBody
          role={role}
          roles={roles}
          reassignRoleId={reassignRoleId}
          reassignError={tried && missingTarget ? t("roles.deleteModal.selectTargetError") : ""}
          isDeleting={isDeleting}
          onReassignChange={setReassignRoleId}
        />
        <FormErrorAlert message={serverError} />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            {t("roles.deleteModal.cancel")}
          </Button>
          <Button
            variant="danger"
            loading={isDeleting}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
