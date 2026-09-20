import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { PasswordInput } from "@/core/components/ui/password-input";

import { AUTH_LINK_CLASS, EMAIL_FORMAT_ERROR } from "../lib/auth-copy";
import type { RegisterValues } from "../lib/auth-schemas";
import type { FormSubmitHandler } from "../lib/on-form-submit";
import type { useAuthForm } from "../lib/use-auth-form";
import { AuthCard } from "./auth-card";
import { AuthField } from "./auth-field";
import { ServerAlert } from "./server-alert";

type RegisterFormState = ReturnType<typeof useAuthForm<RegisterValues>>;

interface RegisterFormFieldsProps {
  form: RegisterFormState;
  serverError: string;
  submitting: boolean;
  onSubmit: FormSubmitHandler;
}

export function RegisterFormFields({
  form,
  serverError,
  submitting,
  onSubmit,
}: Readonly<RegisterFormFieldsProps>) {
  const passwordError = form.errorFor("password");
  return (
    <AuthCard title="Crear cuenta" subtitle="Regístrate para guardar y acceder a tus OVAs.">
      <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
        <AuthField id="fullName" label="Nombre completo" error={form.errorFor("full_name")}>
          <Input id="fullName" type="text" autoComplete="name" placeholder="Ej: María Pérez" {...form.bind("full_name")} />
        </AuthField>
        <AuthField id="email" label="Correo" error={form.errorFor("email") ? EMAIL_FORMAT_ERROR : undefined}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            autoCapitalize="none"
            placeholder="estudiante@upao.edu"
            {...form.bind("email")}
          />
        </AuthField>
        <AuthField id="password" label="Contraseña">
          <PasswordInput id="password" autoComplete="new-password" placeholder="••••••••" {...form.bind("password")} />
        </AuthField>
        <p className="text-xs text-muted-foreground">
          {passwordError ? (
            <span className="text-destructive">Mínimo 8 caracteres con letras y números.</span>
          ) : (
            <span>Usa al menos 8 caracteres con letras y números.</span>
          )}
        </p>
        {serverError ? <ServerAlert>{serverError}</ServerAlert> : null}
        <Button type="submit" className="w-full" loading={submitting} disabled={!form.isValid || submitting}>
          {submitting ? "Creando cuenta..." : "Crear cuenta"}
        </Button>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className={AUTH_LINK_CLASS}>
            Iniciar sesión
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
