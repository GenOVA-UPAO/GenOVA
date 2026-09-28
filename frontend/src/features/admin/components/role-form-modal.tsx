import { type SyntheticEvent, useState } from "react";

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

function nameLockReason(editingRole: Role | null): string | null {
  if (!isThesisRole(editingRole?.name)) return null;
  return "El modo tesis asigna este rol por su nombre, así que no se puede cambiar.";
}

function modalTitle(editingRole: Role | null): string {
  if (editingRole === null) return "Nuevo rol";
  return `Editar rol «${formatRoleName(editingRole.name)}»`;
}

function modalDescription(editingRole: Role | null): string {
  if (editingRole === null) return "Ponle un nombre y marca lo que podrán hacer sus usuarios.";
  const what = nameLockReason(editingRole) === null ? "el nombre" : "la descripción";
  return `Cambia ${what} o los permisos. Los usuarios con este rol verán el cambio al instante.`;
}

function roleNameError(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") return "Escribe un nombre para el rol.";
  if (trimmed.length > 64) return "El nombre no puede superar los 64 caracteres.";
  return "";
}

function submitLabel(isEdit: boolean, isSubmitting: boolean): string {
  if (isSubmitting) return isEdit ? "Guardando…" : "Creando…";
  return isEdit ? "Guardar cambios" : "Crear rol";
}

interface RoleFormModalProps {
  editingRole: Role | null;
  isSubmitting: boolean;
  serverError: string;
  onSubmit: (payload: RoleFormPayload) => void;
  onClose: () => void;
}

export function RoleFormModal({
  editingRole,
  isSubmitting,
  serverError,
  onSubmit,
  onClose,
}: Readonly<RoleFormModalProps>) {
  const [name, setName] = useState(editingRole?.name ?? "");
  // Misma descripción que se ve en la lista (sin los « — » del seed).
  const [description, setDescription] = useState(
    formatRoleDescription(editingRole?.description),
  );
  const [permissions, setPermissions] = useState<string[]>(editingRole?.permissions ?? []);
  const [nameError, setNameError] = useState("");

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = roleNameError(name);
    setNameError(error);
    if (error !== "") {
      document.getElementById("role-name-input")?.focus();
      return;
    }
    onSubmit({ name: name.trim(), description, permissions });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="max-h-[92dvh] overflow-y-auto overscroll-contain sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{modalTitle(editingRole)}</DialogTitle>
          <DialogDescription>{modalDescription(editingRole)}</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={(event) => {
            handleSubmit(event);
          }}
          className="space-y-5"
        >
          <RoleFormFields
            name={name}
            nameError={nameError}
            nameLockReason={nameLockReason(editingRole)}
            description={description}
            disabled={isSubmitting}
            onNameChange={(value) => {
              setName(value);
              if (nameError !== "") setNameError("");
            }}
            onDescriptionChange={setDescription}
          />

          <fieldset>
            <legend className="mb-3 text-sm font-medium">Permisos</legend>
            <RolePermissionsFieldset
              permissions={permissions}
              disabled={isSubmitting}
              onToggle={(permissionId) => {
                setPermissions((current) => togglePermission(current, permissionId));
              }}
            />
          </fieldset>

          <FormErrorAlert message={serverError} />

          <RoleFormActions
            isSubmitting={isSubmitting}
            submitLabel={submitLabel(editingRole !== null, isSubmitting)}
            onCancel={onClose}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
