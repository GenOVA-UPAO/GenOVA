import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";

import { AUTH_LINK_CLASS, BACK_TO_LOGIN } from "../lib/auth-copy";
import type { ForgotPasswordValues } from "../lib/auth-schemas";
import type { FormSubmitHandler } from "../lib/on-form-submit";
import type { useAuthForm } from "../lib/use-auth-form";
import { AuthField } from "./auth-field";
import { ServerAlert } from "./server-alert";

type FormState = ReturnType<typeof useAuthForm<ForgotPasswordValues>>;

interface ForgotPasswordFormProps {
  form: FormState;
  submitting: boolean;
  error: string;
  onSubmit: FormSubmitHandler;
}

export function ForgotPasswordForm({
  form,
  submitting,
  error,
  onSubmit,
}: Readonly<ForgotPasswordFormProps>) {
  return (
    <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
      <AuthField id="email" label="Correo" error={form.errorFor("email")}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          autoCapitalize="none"
          placeholder="nombre@upao.edu.pe"
          {...form.bind("email")}
        />
      </AuthField>
      {error ? <ServerAlert>{error}</ServerAlert> : null}
      <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={submitting}>
        {submitting ? "Enviando…" : "Enviar enlace"}
      </Button>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        ¿Recordaste tu contraseña?{" "}
        <Link to="/login" className={AUTH_LINK_CLASS}>
          {BACK_TO_LOGIN}
        </Link>
      </p>
    </form>
  );
}
