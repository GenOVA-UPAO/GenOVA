import { useState } from "react";
import { useSearchParams } from "react-router";

import { authApi } from "@/core/auth/auth.service";

import { AuthCard } from "../components/auth-card";
import { ResetPasswordBody } from "../components/reset-password-body";
import { CONNECT_ERROR } from "../lib/auth-copy";
import { resetPasswordSchema } from "../lib/auth-schemas";
import { onFormSubmit } from "../lib/on-form-submit";
import { useAuthForm } from "../lib/use-auth-form";

type Status = "idle" | "submitting" | "success" | "error";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const form = useAuthForm(resetPasswordSchema, { new_password: "", confirm_password: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const onSubmit = onFormSubmit(async (formEl) => {
    if (!token) return;
    if (!form.isValid) {
      form.revealErrors(formEl);
      return;
    }
    setStatus("submitting");
    setMessage("");
    try {
      const { ok, data } = await authApi.resetPassword(token, form.values.new_password);
      setStatus(ok ? "success" : "error");
      setMessage(pickMessage(ok, data.message));
    } catch {
      setStatus("error");
      setMessage(CONNECT_ERROR);
    }
  });

  return (
    <AuthCard
      title={token ? "Nueva contraseña" : "Enlace incompleto"}
      subtitle={
        token
          ? "Elige una contraseña nueva para tu cuenta."
          : "Al enlace le falta el código de restablecimiento. Puede haberse cortado al copiarlo."
      }
    >
      <ResetPasswordBody
        token={token}
        status={status}
        message={message}
        form={form}
        onSubmit={onSubmit}
      />
    </AuthCard>
  );
}

function pickMessage(ok: boolean, message: string | undefined): string {
  if (message) return message;
  return ok ? "Contraseña restablecida con éxito." : "No se pudo restablecer la contraseña.";
}
