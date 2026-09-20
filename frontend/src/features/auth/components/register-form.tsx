import { useState } from "react";
import { useNavigate } from "react-router";

import { authApi } from "@/core/auth/auth.service";
import { authStore } from "@/core/auth/auth-store";

import { CONNECT_ERROR } from "../lib/auth-copy";
import { registerSchema } from "../lib/auth-schemas";
import { registerNeedsNotice } from "../lib/login-outcome";
import { onFormSubmit } from "../lib/on-form-submit";
import { useAuthForm } from "../lib/use-auth-form";
import { RegisterFormFields } from "./register-form-fields";

interface RegisterFormProps {
  onRegistered: (email: string) => void;
}

export function RegisterForm({ onRegistered }: Readonly<RegisterFormProps>) {
  const navigate = useNavigate();
  const form = useAuthForm(registerSchema, { full_name: "", email: "", password: "" });
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = onFormSubmit(async () => {
    if (!form.isValid) return;
    setServerError("");
    setSubmitting(true);
    try {
      const { full_name, email, password } = form.values;
      const { status, data } = await authApi.register(full_name, email, password);
      const notice = registerNeedsNotice(status, data.email_verification_required);
      if (notice === true) {
        onRegistered(email);
        return;
      }
      if (notice === false) {
        await authStore.revalidate();
        void navigate("/dashboard");
        return;
      }
      setServerError(data.message ?? "No se pudo completar el registro.");
    } catch {
      setServerError(CONNECT_ERROR);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <RegisterFormFields
      form={form}
      serverError={serverError}
      submitting={submitting}
      onSubmit={onSubmit}
    />
  );
}
