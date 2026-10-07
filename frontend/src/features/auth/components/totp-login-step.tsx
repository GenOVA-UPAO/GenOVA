import { useState } from "react";
import { useTranslation } from "react-i18next";

import { authApi } from "@/core/auth/auth.service";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";

import { connectError } from "../lib/auth-copy";
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
  /** Pide un ticket nuevo tras un fallo; `false` si no se pudo y hay que volver al inicio. */
  onRenewTicket?: () => Promise<boolean>;
}

function focusCode(formEl: HTMLFormElement) {
  const input = formEl.querySelector<HTMLInputElement>("#code");
  input?.focus();
  input?.select();
}

export function TotpLoginStep({ ticket, onSuccess, onCancel, onRenewTicket }: Readonly<TotpLoginStepProps>) {
  const { t } = useTranslation("auth");
  const form = useAuthForm(totpSchema, { code: "" });
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [expired, setExpired] = useState(false);

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
      // El servidor gasta el ticket en cada intento (frena la fuerza bruta): se pide uno
      // nuevo en silencio para que un dígito erróneo no obligue a repetir la contraseña.
      const message = data.message ?? t("totp.failed");
      if (onRenewTicket && (await onRenewTicket())) {
        setServerError(t("totp.retry", { message }));
        focusCode(formEl);
        return;
      }
      setServerError(t("totp.restart", { message }));
      setExpired(true);
    } catch {
      setServerError(connectError());
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthCard
      title={t("totp.title")}
      subtitle={t("totp.subtitle")}
    >
      <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
        <AuthField
          id="code"
          label={t("totp.code")}
          error={form.errorFor("code")}
          hint={t("totp.hint")}
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
        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={submitting}
          disabled={submitting || expired}
        >
          {submitting ? t("totp.submitting") : t("totp.submit")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={onCancel}
        >
          {t("totp.back")}
        </Button>
      </form>
    </AuthCard>
  );
}
