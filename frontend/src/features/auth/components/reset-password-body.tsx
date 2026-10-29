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

import { useTranslation } from "react-i18next";

export function ResetPasswordBody({
  token,
  status,
  message,
  form,
  onSubmit,
}: Readonly<ResetPasswordBodyProps>) {
  const { t } = useTranslation("auth");

  if (status === "success") {
    return <AuthSuccessPanel message={message} href="/login" actionLabel={t("reset.goToLogin")} />;
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
