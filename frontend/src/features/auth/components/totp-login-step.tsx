import { useState } from "react";

import { authApi } from "@/core/auth/auth.service";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";

import { CONNECT_ERROR } from "../lib/auth-copy";
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
      // Sin mensaje del servidor no se sabe si el código falló o el servidor no respondió
      // (withOk no expone el estado): un texto neutro no culpa al código por un 502.
      setServerError(data.message ?? "No se pudo verificar el código. Intenta de nuevo.");
    } catch {
      setServerError(CONNECT_ERROR);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthCard
      title="Verificación en dos pasos"
      subtitle="Abre tu app autenticadora y escribe el código de 6 dígitos que muestra ahora."
    >
      <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
        <AuthField
          id="code"
          label="Código"
          error={form.errorFor("code")}
          hint="¿Sin acceso a la app? Usa uno de tus códigos de respaldo."
        >
          <Input
            id="code"
            type="text"
            autoComplete="one-time-code"
            spellCheck={false}
            autoCapitalize="none"
            maxLength={9}
            {...form.bind("code", { hint: true })}
          />
        </AuthField>
        {serverError ? <ServerAlert>{serverError}</ServerAlert> : null}
        <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={submitting}>
          {submitting ? "Verificando…" : "Verificar"}
        </Button>
        <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={onCancel}>
          Volver al inicio de sesión
        </Button>
      </form>
    </AuthCard>
  );
}
