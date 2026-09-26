import { useState } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { ErrorAlert } from "./error-alert";
import { ProfileSection } from "./profile-section";
import { TotpDisableForm } from "./totp-disable-form";

interface TotpEnabledPanelProps {
  serverError: string;
  isDisabling: boolean;
  onDisable: (code: string) => void;
  onDismissError: () => void;
}

/**
 * Estado «activada». Desactivar queda detrás de un botón: antes el campo de código
 * y el botón rojo ocupaban la tarjeta como si fuera lo principal que hacer aquí.
 */
export function TotpEnabledPanel({
  serverError,
  isDisabling,
  onDisable,
  onDismissError,
}: Readonly<TotpEnabledPanelProps>) {
  const [showDisableForm, setShowDisableForm] = useState(false);

  return (
    <ProfileSection
      title="Verificación en dos pasos"
      description="Al entrar, además de tu contraseña, se te pide un código de tu app autenticadora."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm font-medium text-success-strong">
          <Icon name="shield-check" size="text-lg" /> Activada
        </p>
        {!showDisableForm && (
          <Button
            variant="outline"
            className="max-sm:h-11 max-sm:w-full"
            onClick={() => {
              setShowDisableForm(true);
            }}
          >
            Desactivar
          </Button>
        )}
      </div>
      {showDisableForm && (
        <TotpDisableForm
          isDisabling={isDisabling}
          onDisable={onDisable}
          onCancel={() => {
            setShowDisableForm(false);
            onDismissError();
          }}
        />
      )}
      <ErrorAlert message={serverError} />
    </ProfileSection>
  );
}
