import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { PasswordInput } from "@/core/components/ui/password-input";

import { AUTH_LINK_CLASS, SESSION_EXPIRED_NOTICE } from "../lib/auth-copy";
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
  expired: boolean;
  submitting: boolean;
  onSubmit: FormSubmitHandler;
}

export function LoginFormFields(props: Readonly<LoginFormFieldsProps>) {
  const { form, rememberMe, onRemember, serverError, expired, submitting, onSubmit } = props;
  return (
    <AuthCard title="Iniciar sesión" subtitle="Accede para crear y gestionar tus OVAs.">
      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        {expired ? <ServerAlert tone="info">{SESSION_EXPIRED_NOTICE}</ServerAlert> : null}
        <AuthField id="email" label="Correo" error={form.errorFor("email")}>
          <Input id="email" type="email" autoComplete="email" placeholder="estudiante@genova.ai" {...form.bind("email")} />
        </AuthField>
        <AuthField id="password" label="Contraseña" error={form.errorFor("password")}>
          <PasswordInput id="password" autoComplete="current-password" placeholder="••••••••" {...form.bind("password")} />
        </AuthField>
        {serverError ? <ServerAlert>{serverError}</ServerAlert> : null}
        <div className="flex items-center justify-between gap-3">
          <RememberCheckbox checked={rememberMe} onCheckedChange={onRemember} />
          <Link to="/forgot-password" className={`shrink-0 text-sm ${AUTH_LINK_CLASS}`}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={submitting} disabled={!form.isValid || submitting}>
          {submitting ? "Ingresando..." : "Entrar"}
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className={AUTH_LINK_CLASS}>
            Crear cuenta
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
