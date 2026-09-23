import { useState } from "react";

import { authApi } from "@/core/auth/auth.service";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";

import { totpSchema } from "../lib/auth-schemas";
import { onFormSubmit } from "../lib/on-form-submit";
import { useAuthForm } from "../lib/use-auth-form";
import { AuthCard } from "./auth-card";
import { AuthField } from "./auth-field";
import { ServerAlert } from "./server-alert";

interface TotpLoginStepProps {
  ticket: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TotpLoginStep({ ticket, onSuccess, onCancel }: Readonly<TotpLoginStepProps>) {
  const form = useAuthForm(totpSchema, { code: "" });
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = onFormSubmit(async (formEl) => {
    if (!form.isValid) {
      form.revealErrors(formEl);
      return;
    }
    setServerError("");
    setSubmitting(true);
    try {
      const { ok, data } = await authApi.verifyTotpLogin(ticket, form.values.code);
      if (ok) {
        onSuccess();
        return;
      }
      setServerError(data.message ?? "Código incorrecto.");
    } catch {
      setServerError("No se pudo conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthCard
      eyebrow="Verificación en 2 pasos"
      title="Código de autenticación"
      subtitle="Abre tu aplicación autenticadora e ingresa el código de 6 dígitos. También puedes usar un código de respaldo."
    >
      <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
        <AuthField id="code" label="Código" error={form.errorFor("code")}>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            {...form.bind("code")}
          />
        </AuthField>
        {serverError ? <ServerAlert>{serverError}</ServerAlert> : null}
        <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={submitting}>
          {submitting ? "Verificando…" : "Verificar"}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-center text-sm text-muted-foreground hover:underline"
        >
          Volver al inicio de sesión
        </button>
      </form>
    </AuthCard>
  );
}
