import { type SyntheticEvent, useState } from "react";

import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";

import { describedBy } from "../lib/described-by";
import { totpCodeError } from "../lib/totp-code";
import type { SetupData } from "../lib/types";
import { BackupCodesBox } from "./backup-codes-box";
import { ErrorAlert } from "./error-alert";
import { FormField } from "./form-field";
import { ProfileSection } from "./profile-section";
import { TotpEnrollment } from "./totp-enrollment";

interface TotpSetupPanelProps {
  data: SetupData;
  isSubmitting: boolean;
  serverError: string;
  onConfirm: (code: string) => void;
  onCancel: () => void;
}

export function TotpSetupPanel({
  data,
  isSubmitting,
  serverError,
  onConfirm,
  onCancel,
}: Readonly<TotpSetupPanelProps>) {
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const error = totpCodeError(code);
  const showError = touched && error !== "";

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (error !== "" || code === "") {
      document.getElementById("code")?.focus();
      return;
    }
    onConfirm(code.trim());
  };

  const fieldError = showError ? error : undefined;

  return (
    <ProfileSection
      title="Configura tu app autenticadora"
      description="Añade GenOVA a tu app autenticadora y confirma con el código que genera."
    >
      <TotpEnrollment uri={data.provisioning_uri} secret={data.secret} />
      <BackupCodesBox codes={data.backup_codes} />
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="sm:w-56">
          <FormField id="code" label="Código de 6 dígitos de tu app" error={fieldError}>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              spellCheck={false}
              maxLength={6}
              value={code}
              aria-invalid={showError ? true : undefined}
              aria-describedby={describedBy("code", fieldError)}
              onChange={(event) => {
                setCode(event.target.value);
              }}
            />
          </FormField>
        </div>
        <ErrorAlert message={serverError} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" className="max-sm:h-11" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" className="max-sm:h-11" loading={isSubmitting}>
            Confirmar y activar
          </Button>
        </div>
      </form>
    </ProfileSection>
  );
}
