import type { ResetPasswordValues } from "../lib/auth-schemas";
import type { FormSubmitHandler } from "../lib/on-form-submit";
import type { useAuthForm } from "../lib/use-auth-form";
import { AuthSuccessPanel } from "./auth-success-panel";
import { ResetPasswordForm } from "./reset-password-form";
import { ResetTokenMissing } from "./reset-token-missing";

type Status = "idle" | "submitting" | "success" | "error";
type FormState = ReturnType<typeof useAuthForm<ResetPasswordValues>>;

interface ResetPasswordBodyProps {
  token: string | null;
  status: Status;
  message: string;
  form: FormState;
  onSubmit: FormSubmitHandler;
}

export function ResetPasswordBody({
  token,
  status,
  message,
  form,
  onSubmit,
}: Readonly<ResetPasswordBodyProps>) {
  if (status === "success") {
    return <AuthSuccessPanel message={message} href="/login" actionLabel="Ir a iniciar sesión" />;
  }
  if (!token) return <ResetTokenMissing />;
  return (
    <ResetPasswordForm
      form={form}
      submitting={status === "submitting"}
      error={status === "error" ? message : ""}
      onSubmit={onSubmit}
    />
  );
}
