import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

import { authApi } from "@/core/auth/auth.service";
import { authStore } from "@/core/auth/auth-store";

import { type LoginCredentials,LoginForm } from "../components/login-form";
import { TotpLoginStep } from "../components/totp-login-step";
import { VerifyEmailNotice } from "../components/verify-email-notice";
import { applyLoginOutcome } from "../lib/login-outcome";
import { safeReturnUrl } from "../lib/safe-return-url";
import { resendVerification } from "../services/verification";

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [totpTicket, setTotpTicket] = useState<string | null>(null);

  // Solo en memoria y solo durante el paso de 2FA: permite pedir un ticket nuevo tras un
  // código erróneo (el servidor gasta el ticket en cada intento) sin escribir la clave otra vez.
  const credentials = useRef<LoginCredentials | null>(null);

  function leaveTotpStep() {
    credentials.current = null;
    setTotpTicket(null);
  }

  async function renewTicket(): Promise<boolean> {
    const saved = credentials.current;
    if (!saved) return false;
    try {
      const { status, data } = await authApi.login(saved.email, saved.password, saved.rememberMe);
      const result = applyLoginOutcome(status, data);
      if (!result.totp) return false;
      setTotpTicket(result.totp);
      return true;
    } catch {
      return false;
    }
  }

  async function onTotpSuccess() {
    credentials.current = null;
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
        onRenewTicket={renewTicket}
        onCancel={leaveTotpStep}
      />
    );
  }

  return <LoginForm onUnverified={setUnverifiedEmail} onTotp={(ticket, creds) => {
        credentials.current = creds;
        setTotpTicket(ticket);
      }} />;
}
