import { type SyntheticEvent, useState } from "react";

import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";

import { describedBy } from "../lib/described-by";
import { totpCodeError } from "../lib/totp-code";
import type { SetupData } from "../lib/types";
import { BackupCodesBox } from "./backup-codes-box";
import { CopyField } from "./copy-field";
import { ErrorAlert } from "./error-alert";
import { FormField } from "./form-field";
import { ProfileSection } from "./profile-section";

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
    if (error !== "" || code === "") return;
    onConfirm(code);
  };

  const fieldError = showError ? error : undefined;

  return (
    <ProfileSection
      title="Configura tu app autenticadora"
      description="Añade GenOVA a tu app autenticadora y confirma con el código que genera."
    >
      <ol className="list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
        <li>Abre la app y añade una cuenta con la URI o la clave secreta de abajo.</li>
        <li>Escribe el código de 6 dígitos que aparece en la app.</li>
      </ol>
      <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-3">
        <CopyField
          label="URI de aprovisionamiento"
          value={data.provisioning_uri}
          ariaLabel="Copiar URI"
        />
        <CopyField label="Clave secreta" value={data.secret} ariaLabel="Copiar clave" mono />
      </div>
      <BackupCodesBox codes={data.backup_codes} />
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="sm:w-56">
          <FormField id="code" label="Código de verificación" error={fieldError}>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
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
