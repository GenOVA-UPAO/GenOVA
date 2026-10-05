import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";

import { ErrorAlert } from "./error-alert";
import { ProfileSection } from "./profile-section";

interface TotpIdlePanelProps {
  serverError: string;
  isStarting: boolean;
  onStart: () => void;
}

export function TotpIdlePanel({ serverError, isStarting, onStart }: Readonly<TotpIdlePanelProps>) {
  const { t } = useTranslation("profile");

  return (
    <ProfileSection
      title={t("totp.title")}
      description={t("totp.idleDescription")}
    >
      <ErrorAlert message={serverError} />
      <Button
        variant="outline"
        className="max-sm:h-11 max-sm:w-full"
        loading={isStarting}
        onClick={onStart}
      >
        {t("totp.activate")}
      </Button>
    </ProfileSection>
  );
}
