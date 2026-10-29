import { type SyntheticEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";

import type { RoleFormPayload } from "../api/admin-roles.api";
import { togglePermission } from "../lib/permissions";
import { formatRoleDescription, formatRoleName } from "../lib/role-utils";
import type { Role } from "../lib/types";
import { isThesisRole } from "../pages/admin-roles-page.helpers";
import { FormErrorAlert } from "./form-error-alert";
import { RoleFormActions } from "./role-form-actions";
import { RoleFormFields } from "./role-form-fields";
import { RolePermissionsFieldset } from "./role-permissions-fieldset";

function roleNameError(name: string, requiredMsg: string, maxMsg: string): string {
  const trimmed = name.trim();
  if (trimmed === "") return requiredMsg;
  if (trimmed.length > 64) return maxMsg;
  return "";
}

interface RoleFormModalProps {
  editingRole: Role | null;
  isSubmitting: boolean;
  serverError: string;
  onSubmit: (payload: RoleFormPayload) => void;
  onClose: () => void;
}

function getRoleModalTexts(
  editingRole: Role | null,
  isSubmitting: boolean,
  t: (key: string, opt?: Record<string, unknown>) => string,
) {
  const isEditing = editingRole !== null;
  const title = isEditing
    ? t("roles.form.editTitle", { name: formatRoleName(editingRole.name) })
    : t("roles.form.createTitle");
  const desc = isEditing
    ? t("roles.form.editDescription")
    : t("roles.form.createDescription");
  let submitText = isEditing ? t("roles.form.save") : t("roles.form.create");
  if (isSubmitting) {
    submitText = isEditing ? t("roles.form.saving") : t("roles.form.creating");
  }
  return { title, desc, submitText };
}

export function RoleFormModal({
  editingRole,
  isSubmitting,
  serverError,
  onSubmit,
  onClose,
}: Readonly<RoleFormModalProps>) {
  const { t } = useTranslation("admin");
  const [name, setName] = useState(editingRole?.name ?? "");
  const [description, setDescription] = useState(
    formatRoleDescription(editingRole?.description),
  );
  const [permissions, setPermissions] = useState<string[]>(editingRole?.permissions ?? []);
  const [nameError, setNameError] = useState("");

  const nameLockReason = isThesisRole(editingRole?.name) ? t("roles.form.thesisHint") : null;
  const { title, desc, submitText } = getRoleModalTexts(editingRole, isSubmitting, t);

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = roleNameError(name, t("roles.form.nameRequired"), t("roles.form.nameMaxLength"));
    setNameError(error);
    if (error !== "") {
      document.getElementById("role-name-input")?.focus();
      return;
    }
    onSubmit({ name: name.trim(), description, permissions });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) onClose();
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto overscroll-contain sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={handleSubmit} className="space-y-5">
          <RoleFormFields
            name={name}
            nameError={nameError}
            nameLockReason={nameLockReason}
            description={description}
            disabled={isSubmitting}
            onNameChange={(val) => {
              setName(val);
              if (nameError !== "") setNameError("");
            }}
            onDescriptionChange={setDescription}
          />
          <fieldset>
            <legend className="mb-3 text-sm font-medium">{t("roles.form.permissionsSection")}</legend>
            <RolePermissionsFieldset
              permissions={permissions}
              disabled={isSubmitting}
              onToggle={(id) => {
                setPermissions((curr) => togglePermission(curr, id));
              }}
            />
          </fieldset>
          <FormErrorAlert message={nameError === "" ? serverError : ""} />
          <RoleFormActions
            isSubmitting={isSubmitting}
            submitLabel={submitText}
            onCancel={onClose}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
