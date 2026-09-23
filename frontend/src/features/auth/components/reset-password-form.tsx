import { Button } from "@/core/components/ui/button";
import { PasswordInput } from "@/core/components/ui/password-input";

import type { ResetPasswordValues } from "../lib/auth-schemas";
import type { FormSubmitHandler } from "../lib/on-form-submit";
import type { useAuthForm } from "../lib/use-auth-form";
import { AuthField } from "./auth-field";
import { ServerAlert } from "./server-alert";

type FormState = ReturnType<typeof useAuthForm<ResetPasswordValues>>;

interface ResetPasswordFormProps {
  form: FormState;
  submitting: boolean;
  error: string;
  onSubmit: FormSubmitHandler;
}

export function ResetPasswordForm({
  form,
  submitting,
  error,
  onSubmit,
}: Readonly<ResetPasswordFormProps>) {
  return (
    <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
      <AuthField id="new_password" label="Nueva contraseña" error={form.errorFor("new_password")}>
        <PasswordInput
          id="new_password"
          autoComplete="new-password"
          {...form.bind("new_password")}
        />
      </AuthField>
      <AuthField id="confirm_password" label="Confirmar contraseña" error={form.errorFor("confirm_password")}>
        <PasswordInput
          id="confirm_password"
          autoComplete="new-password"
          {...form.bind("confirm_password")}
        />
      </AuthField>
      {error ? <ServerAlert>{error}</ServerAlert> : null}
      <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={submitting}>
        {submitting ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
