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
import type { Role } from "../lib/types";
import { FormErrorAlert } from "./form-error-alert";
import { RoleFormActions } from "./role-form-actions";
import { RoleFormFields } from "./role-form-fields";
import { RolePermissionsFieldset } from "./role-permissions-fieldset";

const LABEL_CLASS = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

function modalTitle(editingRole: Role | null): string {
  if (editingRole === null) return "Crear nuevo rol";
  return `Editar rol: ${editingRole.name ?? ""}`;
}

function modalDescription(editingRole: Role | null): string {
  if (editingRole === null) {
    return "Elige un nombre único y asigna los permisos necesarios para este perfil.";
  }
  return "Ajusta el nombre y la selección de permisos para este perfil del sistema.";
}

function submitLabel(isEdit: boolean, isSubmitting: boolean): string {
  if (isSubmitting) return isEdit ? "Guardando..." : "Creando...";
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
  const [formError, setFormError] = useState("");
  const error = formError !== "" ? formError : serverError;

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName === "") {
      setFormError("El nombre del rol es obligatorio.");
      return;
    }
    if (trimmedName.length > 64) {
      setFormError("El nombre del rol no debe superar los 64 caracteres.");
      return;
    }
    setFormError("");
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
            description={description}
            disabled={isSubmitting}
            onNameChange={(value) => {
              setName(value);
              if (formError !== "") setFormError("");
            }}
            onDescriptionChange={setDescription}
          />

          <div className="space-y-2">
            <p className={LABEL_CLASS}>Permisos del rol</p>
            <RolePermissionsFieldset
              permissions={permissions}
              disabled={isSubmitting}
              onToggle={(permissionId) => {
                setPermissions((current) => togglePermission(current, permissionId));
              }}
            />
          </div>

          <FormErrorAlert message={error} />

          <RoleFormActions
            isSubmitting={isSubmitting}
            canSubmit={name.trim() !== ""}
            submitLabel={submitLabel(editingRole !== null, isSubmitting)}
            onCancel={onClose}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
