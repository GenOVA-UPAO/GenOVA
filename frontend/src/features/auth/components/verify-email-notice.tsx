import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { AUTH_LINK_CLASS } from "../lib/auth-copy";
import { AuthStatusCard } from "./auth-status-card";

interface VerifyEmailNoticeProps {
  email: string;
  onResend: () => Promise<string>;
}

type ResendStatus = "idle" | "sending" | "sent";

export function VerifyEmailNotice({ email, onResend }: Readonly<VerifyEmailNoticeProps>) {
  const { t } = useTranslation("auth");
  const [status, setStatus] = useState<ResendStatus>("idle");
  const [message, setMessage] = useState("");

  async function handleResend() {
    setStatus("sending");
    try {
      const msg = await onResend();
      setMessage(msg === "" ? t("notice.resent") : msg);
    } catch {
      setMessage(t("notice.resendFailed"));
    } finally {
      setStatus("sent");
    }
  }

  return (
    <AuthStatusCard>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Icon name="envelope-simple" size="text-2xl" className="text-primary" />
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">{t("notice.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Trans
          ns="auth"
          i18nKey="notice.sent"
          values={{ email }}
          components={{ email: <span className="break-words font-medium text-foreground" /> }}
        />
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
        {status === "sending" ? t("notice.resending") : t("notice.resend")}
      </Button>
      <p className="mt-5 text-sm text-muted-foreground">
        <Link to="/login" className={AUTH_LINK_CLASS}>
          {t("common.backToLogin")}
        </Link>
      </p>
    </AuthStatusCard>
  );
}
