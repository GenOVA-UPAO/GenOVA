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
import { formatRoleName } from "../lib/role-utils";
import type { Role } from "../lib/types";
import { FormErrorAlert } from "./form-error-alert";
import { RoleFormActions } from "./role-form-actions";
import { RoleFormFields } from "./role-form-fields";
import { RolePermissionsFieldset } from "./role-permissions-fieldset";

function modalTitle(editingRole: Role | null): string {
  if (editingRole === null) return "Nuevo rol";
  return `Editar rol «${formatRoleName(editingRole.name)}»`;
}

function modalDescription(editingRole: Role | null): string {
  if (editingRole === null) return "Ponle un nombre y marca lo que podrán hacer sus usuarios.";
  return "Cambia el nombre o los permisos. Los usuarios con este rol verán el cambio al instante.";
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
  const [description, setDescription] = useState(editingRole?.description ?? "");
  const [permissions, setPermissions] = useState<string[]>(editingRole?.permissions ?? []);
  const [nameError, setNameError] = useState("");

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName === "") {
      setNameError("Escribe un nombre para el rol.");
      return;
    }
    if (trimmedName.length > 64) {
      setNameError("El nombre no puede superar los 64 caracteres.");
      return;
    }
    setNameError("");
    onSubmit({ name: trimmedName, description, permissions });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{modalTitle(editingRole)}</DialogTitle>
          <DialogDescription>{modalDescription(editingRole)}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            handleSubmit(event);
          }}
          className="space-y-5"
        >
          <RoleFormFields
            name={name}
            nameError={nameError}
            description={description}
            disabled={isSubmitting}
            onNameChange={(value) => {
              setName(value);
              if (nameError !== "") setNameError("");
            }}
            onDescriptionChange={setDescription}
          />

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Permisos</legend>
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
