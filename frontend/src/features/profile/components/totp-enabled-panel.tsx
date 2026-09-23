import { useState } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";

import { describedBy } from "../lib/described-by";
import { ErrorAlert } from "./error-alert";
import { FormField } from "./form-field";
import { ProfileSection } from "./profile-section";

const CODE_HINT = "El código de 6 dígitos que muestra tu app autenticadora.";

interface TotpEnabledPanelProps {
  serverError: string;
  isDisabling: boolean;
  onDisable: (code: string) => void;
}

export function TotpEnabledPanel({
  serverError,
  isDisabling,
  onDisable,
}: Readonly<TotpEnabledPanelProps>) {
  const [code, setCode] = useState("");
  const [tried, setTried] = useState(false);
  const codeError = tried && code.length < 6 ? "Escribe los 6 dígitos del código." : undefined;

  return (
    <ProfileSection
      title="Verificación en dos pasos"
      description="Para desactivarla, confirma con un código de tu app autenticadora."
    >
      <p className="flex items-center gap-2 text-sm font-medium text-success-strong">
        <Icon name="shield-check" size="text-lg" /> Activada: tu cuenta pide un código al entrar.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="sm:w-56">
          <FormField id="disable-code" label="Código actual" hint={CODE_HINT} error={codeError}>
            <Input
              id="disable-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              aria-invalid={codeError ? true : undefined}
              aria-describedby={describedBy("disable-code", codeError, CODE_HINT)}
              onChange={(event) => {
                setCode(event.target.value);
              }}
            />
          </FormField>
        </div>
        <Button
          variant="destructive"
          className="max-sm:h-11 sm:mt-6"
          loading={isDisabling}
          onClick={() => {
            setTried(true);
            if (code.length === 6) onDisable(code);
          }}
        >
          Desactivar
        </Button>
      </div>
      <ErrorAlert message={serverError} />
    </ProfileSection>
  );
}
