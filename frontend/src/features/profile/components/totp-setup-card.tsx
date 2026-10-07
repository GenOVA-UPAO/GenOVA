import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useConfirmTotpSetup, useDisableTotp, useStartTotpSetup } from "../hooks/use-totp";
import { errorMessage } from "../lib/error-message";
import type { SetupData, TotpPhase } from "../lib/types";
import { TotpEnabledPanel } from "./totp-enabled-panel";
import { TotpIdlePanel } from "./totp-idle-panel";
import { TotpSetupPanel } from "./totp-setup-panel";

interface TotpSetupCardProps {
  totpEnabled: boolean;
}

function useTotpCardState(totpEnabled: boolean) {
  const { t } = useTranslation("profile");
  const [explicitPhase, setExplicitPhase] = useState<TotpPhase | null>(null);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [serverError, setServerError] = useState("");
  const startSetup = useStartTotpSetup();
  const confirmSetup = useConfirmTotpSetup();
  const disable = useDisableTotp();
  const phase = explicitPhase ?? (totpEnabled ? "enabled" : "idle");

  const onApiError = (error: unknown) => {
    setServerError(errorMessage(error, t("totp.connectError")));
  };

  const handleStart = () => {
    setServerError("");
    startSetup.mutate(undefined, {
      onSuccess: (data) => {
        setSetupData(data);
        setExplicitPhase("setup");
      },
      onError: onApiError,
    });
  };

  const handleConfirm = (code: string) => {
    setServerError("");
    confirmSetup.mutate(code, {
      onSuccess: () => {
        setSetupData(null);
        setExplicitPhase("enabled");
        toast.success(t("totp.enabledToast"));
      },
      onError: onApiError,
    });
  };

  const handleDisable = (code: string) => {
    setServerError("");
    disable.mutate(code, {
      onSuccess: () => {
        setExplicitPhase("idle");
        toast.success(t("totp.disabledToast"));
      },
      onError: onApiError,
    });
  };

  const handleCancelSetup = () => {
    setSetupData(null);
    setServerError("");
    setExplicitPhase("idle");
  };

  const handleDismissError = () => {
    setServerError("");
  };

  return {
    phase,
    setupData,
    serverError,
    isStarting: startSetup.isPending,
    isConfirming: confirmSetup.isPending,
    isDisabling: disable.isPending,
    handleStart,
    handleConfirm,
    handleDisable,
    handleCancelSetup,
    handleDismissError,
  };
}

export function TotpSetupCard({ totpEnabled }: Readonly<TotpSetupCardProps>) {
  const state = useTotpCardState(totpEnabled);

  if (state.phase === "setup" && state.setupData !== null) {
    return (
      <TotpSetupPanel
        data={state.setupData}
        isSubmitting={state.isConfirming}
        serverError={state.serverError}
        onConfirm={state.handleConfirm}
        onCancel={state.handleCancelSetup}
      />
    );
  }

  if (state.phase === "enabled") {
    return (
      <TotpEnabledPanel
        serverError={state.serverError}
        isDisabling={state.isDisabling}
        onDisable={state.handleDisable}
        onDismissError={state.handleDismissError}
      />
    );
  }

  return (
    <TotpIdlePanel
      serverError={state.serverError}
      isStarting={state.isStarting}
      onStart={state.handleStart}
    />
  );
}
