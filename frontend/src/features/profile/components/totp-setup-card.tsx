import { useState } from "react";

import { useConfirmTotpSetup, useDisableTotp, useStartTotpSetup } from "../hooks/use-totp";
import { errorMessage } from "../lib/error-message";
import type { SetupData, TotpPhase } from "../lib/types";
import { TotpEnabledPanel } from "./totp-enabled-panel";
import { TotpIdlePanel } from "./totp-idle-panel";
import { TotpSetupPanel } from "./totp-setup-panel";

const CONNECT_ERROR = "No se pudo conectar con el servidor.";

interface TotpSetupCardProps {
  totpEnabled: boolean;
}

export function TotpSetupCard({ totpEnabled }: Readonly<TotpSetupCardProps>) {
  const [explicitPhase, setExplicitPhase] = useState<TotpPhase | null>(null);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [serverError, setServerError] = useState("");
  const startSetup = useStartTotpSetup();
  const confirmSetup = useConfirmTotpSetup();
  const disable = useDisableTotp();

  const phase = explicitPhase ?? (totpEnabled ? "enabled" : "idle");

  const handleStart = () => {
    setServerError("");
    startSetup.mutate(undefined, {
      onSuccess: (data) => {
        setSetupData(data);
        setExplicitPhase("setup");
      },
      onError: (error) => {
        setServerError(errorMessage(error, CONNECT_ERROR));
      },
    });
  };

  const handleConfirm = (code: string) => {
    setServerError("");
    confirmSetup.mutate(code, {
      onSuccess: () => {
        setSetupData(null);
        setExplicitPhase("enabled");
      },
      onError: (error) => {
        setServerError(errorMessage(error, CONNECT_ERROR));
      },
    });
  };

  const handleDisable = (code: string) => {
    setServerError("");
    disable.mutate(code, {
      onSuccess: () => {
        setExplicitPhase("idle");
      },
      onError: (error) => {
        setServerError(errorMessage(error, CONNECT_ERROR));
      },
    });
  };

  if (phase === "setup" && setupData !== null) {
    return (
      <TotpSetupPanel
        data={setupData}
        isSubmitting={confirmSetup.isPending}
        serverError={serverError}
        onConfirm={handleConfirm}
        onCancel={() => {
          setSetupData(null);
          setServerError("");
          setExplicitPhase("idle");
        }}
      />
    );
  }

  if (phase === "enabled") {
    return (
      <TotpEnabledPanel
        serverError={serverError}
        isDisabling={disable.isPending}
        onDisable={handleDisable}
      />
    );
  }

  return (
    <TotpIdlePanel
      serverError={serverError}
      isStarting={startSetup.isPending}
      onStart={handleStart}
    />
  );
}
