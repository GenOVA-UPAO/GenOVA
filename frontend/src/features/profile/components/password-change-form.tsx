import type { SyntheticEvent } from "react";

import { Button, Spinner } from "@/core/components/ui/button";

import { passwordSchema } from "../lib/profile-schemas";
import type { ChangePasswordValues } from "../lib/types";
import { useForm } from "../lib/use-form";
import { PasswordChangeFields } from "./password-change-fields";

const EMPTY_PASSWORD: ChangePasswordValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

interface PasswordChangeFormProps {
  isSubmitting: boolean;
  onSave: (values: ChangePasswordValues) => Promise<boolean>;
}

export function PasswordChangeForm({ isSubmitting, onSave }: Readonly<PasswordChangeFormProps>) {
  const form = useForm(passwordSchema, EMPTY_PASSWORD);

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.isValid) return;
    const saved = await onSave(form.values);
    if (saved) form.reset(EMPTY_PASSWORD);
  };

  return (
    <div className="glass-card space-y-6 rounded-3xl p-6 sm:p-8">
      <form
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="space-y-6"
      >
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Seguridad de la Cuenta</h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Actualiza tu contraseña periódicamente para mantener tu cuenta protegida.
          </p>
        </div>

        <PasswordChangeFields
          values={form.values}
          errorFor={form.errorFor}
          onChange={form.setField}
          onBlur={form.touch}
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-end border-t border-border pt-4">
          <Button type="submit" disabled={isSubmitting || !form.isValid}>
            {isSubmitting && <Spinner />}
            {isSubmitting ? "Actualizando..." : "Actualizar Contraseña"}
          </Button>
        </div>
      </form>
    </div>
  );
}
