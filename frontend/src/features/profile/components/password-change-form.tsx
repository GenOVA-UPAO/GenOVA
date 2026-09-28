import type { SyntheticEvent } from "react";

import { Button } from "@/core/components/ui/button";

import { passwordSchema } from "../lib/profile-schemas";
import type { ChangePasswordValues } from "../lib/types";
import { useForm } from "../lib/use-form";
import { PasswordChangeFields } from "./password-change-fields";
import { ProfileSection } from "./profile-section";

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
    if (!form.isValid) {
      form.touchAll(event.currentTarget);
      return;
    }
    const saved = await onSave(form.values);
    if (saved) form.reset(EMPTY_PASSWORD);
  };

  return (
    <ProfileSection
      title="Contraseña"
      description="Usa una contraseña que no utilices en otros sitios."
    >
      <form
        noValidate
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
        className="space-y-5"
      >
        <PasswordChangeFields
          values={form.values}
          errorFor={form.errorFor}
          onChange={form.setField}
          onBlur={form.touch}
          disabled={isSubmitting}
        />
        <div className="flex justify-end border-t border-border pt-5">
          <Button type="submit" className="max-sm:h-11 max-sm:w-full" loading={isSubmitting}>
            Actualizar contraseña
          </Button>
        </div>
      </form>
    </ProfileSection>
  );
}
