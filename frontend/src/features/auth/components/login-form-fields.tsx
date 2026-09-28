import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { PasswordInput } from "@/core/components/ui/password-input";

import { AUTH_LINK_CLASS } from "../lib/auth-copy";
import type { LoginValues } from "../lib/auth-schemas";
import type { FormSubmitHandler } from "../lib/on-form-submit";
import type { useAuthForm } from "../lib/use-auth-form";
import { AuthCard } from "./auth-card";
import { AuthField } from "./auth-field";
import { RememberCheckbox } from "./remember-checkbox";
import { ServerAlert } from "./server-alert";

type LoginFormState = ReturnType<typeof useAuthForm<LoginValues>>;

interface LoginFormFieldsProps {
  form: LoginFormState;
  rememberMe: boolean;
  onRemember: (checked: boolean) => void;
  serverError: string;
  /** Aviso de contexto al llegar (sesión caducada, cuenta eliminada…). */
  notice: string | null;
  submitting: boolean;
  onSubmit: FormSubmitHandler;
}

export function LoginFormFields(props: Readonly<LoginFormFieldsProps>) {
  const { form, rememberMe, onRemember, serverError, notice, submitting, onSubmit } = props;
  return (
    <AuthCard title="Iniciar sesión" subtitle="Accede para crear y gestionar tus OVAs.">
      <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
        {notice === null ? null : <ServerAlert tone="info">{notice}</ServerAlert>}
        <AuthField id="email" label="Correo" error={form.errorFor("email")}>
          <Input id="email" type="email" autoComplete="email" placeholder="nombre@upao.edu.pe" {...form.bind("email")} />
        </AuthField>
        <AuthField id="password" label="Contraseña" error={form.errorFor("password")}>
          <PasswordInput id="password" autoComplete="current-password" {...form.bind("password")} />
        </AuthField>
        {serverError ? <ServerAlert>{serverError}</ServerAlert> : null}
        <div className="flex items-center justify-between gap-3">
          <RememberCheckbox checked={rememberMe} onCheckedChange={onRemember} />
          <Link to="/forgot-password" className={`shrink-0 text-sm ${AUTH_LINK_CLASS}`}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={submitting}>
          {submitting ? "Ingresando…" : "Entrar"}
        </Button>
        <p className="pt-2 text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className={AUTH_LINK_CLASS}>
            Crear cuenta
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
