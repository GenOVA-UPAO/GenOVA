import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { PasswordInput } from "@/core/components/ui/password-input";

import { AUTH_LINK_CLASS } from "../lib/auth-copy";
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
  const { t } = useTranslation("auth");
  const passwordError = form.errorFor("password");
  return (
    <AuthCard title={t("register.title")} subtitle={t("register.subtitle")}>
      <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
        <AuthField id="fullName" label={t("register.fullName")} error={form.errorFor("full_name")}>
          <Input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder={t("register.fullNamePlaceholder")}
            {...form.bind("full_name", { id: "fullName" })}
          />
        </AuthField>
        <AuthField id="email" label={t("common.email")} error={form.errorFor("email")}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            autoCapitalize="none"
            placeholder={t("common.emailPlaceholder")}
            {...form.bind("email")}
          />
        </AuthField>
        <AuthField
          id="password"
          label={t("common.password")}
          error={passwordError ? t("validation.passwordFormat") : undefined}
          hint={t("common.passwordHint")}
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            {...form.bind("password", { hint: true })}
          />
        </AuthField>
        {serverError ? <ServerAlert>{serverError}</ServerAlert> : null}
        <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={submitting}>
          {submitting ? t("register.submitting") : t("register.submit")}
        </Button>
        <p className="pt-2 text-center text-sm text-muted-foreground">
          {t("register.haveAccount")}{" "}
          <Link to="/login" className={AUTH_LINK_CLASS}>
            {t("register.signIn")}
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
