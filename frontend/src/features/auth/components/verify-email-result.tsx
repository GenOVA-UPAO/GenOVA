import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { AuthStatusCard } from "./auth-status-card";

interface VerifyEmailResultProps {
  status: "success" | "error";
  message: string;
  onDashboard: () => void;
}

export function VerifyEmailResult({ status, message, onDashboard }: Readonly<VerifyEmailResultProps>) {
  const { t } = useTranslation("auth");

  if (status === "success") {
    return (
      <AuthStatusCard>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Icon name="check-circle" size="text-2xl" className="text-primary" />
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{t("verify.successTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("verify.successText")}</p>
        <Button type="button" size="lg" className="mt-6 w-full" onClick={onDashboard}>
          {t("verify.toDashboard")}
        </Button>
      </AuthStatusCard>
    );
  }

  const isGeneric = !message || message === t("verify.failed");

  return (
    <AuthStatusCard>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <Icon name="warning-circle" size="text-2xl" className="text-destructive" />
      </div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        {t("verify.errorTitle")}
      </h1>
      <p className="mt-2 text-sm text-pretty text-muted-foreground">
        {isGeneric ? t("verify.linkExpired") : message}
      </p>
      <p className="mt-2 text-sm text-pretty text-muted-foreground">
        {t("verify.errorHint")}
      </p>
      <Button asChild size="lg" className="mt-6 w-full">
        <Link to="/login">{t("common.backToLogin")}</Link>
      </Button>
    </AuthStatusCard>
  );
}
