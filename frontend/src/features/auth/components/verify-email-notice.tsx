import { useState } from "react";
import { Link } from "react-router";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { AUTH_LINK_CLASS, BACK_TO_LOGIN } from "../lib/auth-copy";
import { AuthStatusCard } from "./auth-status-card";

interface VerifyEmailNoticeProps {
  email: string;
  onResend: () => Promise<string>;
}

type ResendStatus = "idle" | "sending" | "sent";

export function VerifyEmailNotice({ email, onResend }: Readonly<VerifyEmailNoticeProps>) {
  const [status, setStatus] = useState<ResendStatus>("idle");
  const [message, setMessage] = useState("");

  async function handleResend() {
    setStatus("sending");
    try {
      const msg = await onResend();
      setMessage(msg === "" ? "Enlace reenviado." : msg);
    } catch {
      setMessage("No se pudo reenviar. Intenta de nuevo en un momento.");
    } finally {
      setStatus("sent");
    }
  }

  return (
    <AuthStatusCard>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Icon name="envelope-simple" size="text-2xl" className="text-primary" />
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">Verifica tu correo</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Te enviamos un enlace de verificación a{" "}
        <span className="break-words font-medium text-foreground">{email}</span>. Ábrelo para activar tu
        cuenta.
      </p>
      <div aria-live="polite" className="mt-4 min-h-5 text-sm text-primary">
        {message}
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-2 w-full"
        onClick={() => {
          void handleResend();
        }}
        disabled={status === "sending"}
        loading={status === "sending"}
      >
        {status === "sending" ? "Reenviando…" : "Reenviar enlace"}
      </Button>
      <p className="mt-5 text-sm text-muted-foreground">
        <Link to="/login" className={AUTH_LINK_CLASS}>
          {BACK_TO_LOGIN}
        </Link>
      </p>
    </AuthStatusCard>
  );
}
