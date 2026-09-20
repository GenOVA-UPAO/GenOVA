import { useState } from "react";

import { authApi } from "@/core/auth/auth.service";

import { AuthCard } from "../components/auth-card";
import { AuthSuccessPanel } from "../components/auth-success-panel";
import { ForgotPasswordForm } from "../components/forgot-password-form";
import { BACK_TO_LOGIN, CONNECT_ERROR } from "../lib/auth-copy";
import { forgotPasswordSchema } from "../lib/auth-schemas";
import { onFormSubmit } from "../lib/on-form-submit";
import { useAuthForm } from "../lib/use-auth-form";

type Status = "idle" | "submitting" | "success" | "error";

export function ForgotPasswordPage() {
  const form = useAuthForm(forgotPasswordSchema, { email: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const onSubmit = onFormSubmit(async () => {
    if (!form.isValid) return;
    setStatus("submitting");
    setMessage("");
    try {
      const { ok, data } = await authApi.forgotPassword(form.values.email);
      setStatus(ok ? "success" : "error");
      setMessage(pickMessage(ok, data.message));
    } catch {
      setStatus("error");
      setMessage(CONNECT_ERROR);
    }
  });

  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Ingresa tu correo y te enviaremos un enlace para restablecer tu acceso."
    >
      {status === "success" ? (
        <AuthSuccessPanel message={message} href="/login" actionLabel={BACK_TO_LOGIN} />
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
  return ok ? "Revisa tu correo para continuar." : "No se pudo solicitar la recuperación.";
}
