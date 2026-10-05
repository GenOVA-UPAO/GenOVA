import i18n from "i18next";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { authApi } from "@/core/auth/auth.service";

import { AuthCard } from "../components/auth-card";
import { AuthSuccessPanel } from "../components/auth-success-panel";
import { ForgotPasswordForm } from "../components/forgot-password-form";
import { backToLogin, connectError } from "../lib/auth-copy";
import { forgotPasswordSchema } from "../lib/auth-schemas";
import { onFormSubmit } from "../lib/on-form-submit";
import { useAuthForm } from "../lib/use-auth-form";

type Status = "idle" | "submitting" | "success" | "error";

export function ForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const form = useAuthForm(forgotPasswordSchema, { email: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const onSubmit = onFormSubmit(async (formEl) => {
    if (!form.isValid) {
      form.revealErrors(formEl);
      return;
    }
    setStatus("submitting");
    setMessage("");
    try {
      const { ok, data } = await authApi.forgotPassword(form.values.email);
      setStatus(ok ? "success" : "error");
      setMessage(pickMessage(ok, data.message));
    } catch {
      setStatus("error");
      setMessage(connectError());
    }
  });

  return (
    <AuthCard
      title={t("forgot.title")}
      subtitle={t("forgot.subtitle")}
    >
      {status === "success" ? (
        <AuthSuccessPanel message={message} href="/login" actionLabel={backToLogin()} />
      ) : (
        <ForgotPasswordForm
          form={form}
          submitting={status === "submitting"}
          error={status === "error" ? message : ""}
          onSubmit={onSubmit}
        />
      )}
    </AuthCard>
  );
}

function pickMessage(ok: boolean, message: string | undefined): string {
  if (message) return message;
  return ok ? i18n.t("auth:forgot.sent") : i18n.t("auth:forgot.failed");
}
