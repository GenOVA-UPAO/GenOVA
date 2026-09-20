import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { authStore } from "@/core/auth/auth-store";

import { LoginForm } from "../components/login-form";
import { TotpLoginStep } from "../components/totp-login-step";
import { VerifyEmailNotice } from "../components/verify-email-notice";
import { safeReturnUrl } from "../lib/safe-return-url";
import { resendVerification } from "../services/verification";

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [totpTicket, setTotpTicket] = useState<string | null>(null);

  async function onTotpSuccess() {
    await authStore.revalidate();
    void navigate(safeReturnUrl(params.get("returnUrl")));
  }

  if (unverifiedEmail) {
    return (
      <VerifyEmailNotice email={unverifiedEmail} onResend={() => resendVerification(unverifiedEmail)} />
    );
  }

  if (totpTicket) {
    return (
      <TotpLoginStep
        ticket={totpTicket}
        onSuccess={() => {
          void onTotpSuccess();
        }}
        onCancel={() => {
          setTotpTicket(null);
        }}
      />
    );
  }

  return <LoginForm onUnverified={setUnverifiedEmail} onTotp={setTotpTicket} />;
}
