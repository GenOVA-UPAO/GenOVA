import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { authApi } from "@/core/auth/auth.service";
import { authStore } from "@/core/auth/auth-store";

import { accountDeletedNotice, connectError, sessionExpiredNotice } from "../lib/auth-copy";
import { loginSchema } from "../lib/auth-schemas";
import { applyLoginOutcome } from "../lib/login-outcome";
import { onFormSubmit } from "../lib/on-form-submit";
import { safeReturnUrl } from "../lib/safe-return-url";
import { useAuthForm } from "../lib/use-auth-form";
import { LoginFormFields } from "./login-form-fields";

interface LoginFormProps {
  onUnverified: (email: string) => void;
  onTotp: (ticket: string, credentials: LoginCredentials) => void;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export function LoginForm({ onUnverified, onTotp }: Readonly<LoginFormProps>) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const form = useAuthForm(loginSchema, { email: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
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
      const { status, data } = await authApi.login(form.values.email, form.values.password, rememberMe);
      const result = applyLoginOutcome(status, data);
      if (result.totp) {
        onTotp(result.totp, {
          email: form.values.email,
          password: form.values.password,
          rememberMe,
        });
        return;
      }
      if (result.unverified) {
        onUnverified(form.values.email);
        return;
      }
      if (result.ok) {
        await authStore.revalidate();
        void navigate(safeReturnUrl(params.get("returnUrl")));
        return;
      }
      setServerError(result.error ?? "");
    } catch {
      setServerError(connectError());
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <LoginFormFields
      form={form}
      rememberMe={rememberMe}
      onRemember={setRememberMe}
      serverError={serverError}
      notice={arrivalNotice(params)}
      submitting={submitting}
      onSubmit={onSubmit}
    />
  );
}

function arrivalNotice(params: URLSearchParams): string | null {
  if (params.get("deleted") === "1") return accountDeletedNotice();
  if (params.get("expired") === "1") return sessionExpiredNotice();
  return null;
}
