import { type SyntheticEvent, useState } from "react";

import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";

import type { AdminUser, UserEditPayload } from "../../lib/types";
import {
  initialUserFormValues,
  toUserEditPayload,
  type UserFormErrors,
  type UserFormValues,
  validateUserForm,
} from "../../lib/user-form";
import { EditUserContactFields } from "./edit-user-contact-fields";
import { EditUserFields } from "./edit-user-fields";

interface EditUserModalProps {
  user: AdminUser;
  isSubmitting: boolean;
  onClose: () => void;
  onSave: (payload: UserEditPayload) => void;
}

export function EditUserModal({
  user,
  isSubmitting,
  onClose,
  onSave,
}: Readonly<EditUserModalProps>) {
  const [values, setValues] = useState<UserFormValues>(() => initialUserFormValues(user));
  const [submitted, setSubmitted] = useState(false);
  const errors: UserFormErrors = submitted ? validateUserForm(values) : {};

  const handleChange = (field: keyof UserFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validateUserForm(values)).length > 0) return;
    onSave(toUserEditPayload(values));
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Perfil: {user.full_name ?? user.email}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            handleSubmit(event);
          }}
          className="space-y-4"
        >
          <EditUserFields
            values={values}
            errors={errors}
            disabled={isSubmitting}
            onChange={handleChange}
          />
          <EditUserContactFields values={values} disabled={isSubmitting} onChange={handleChange} />
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
