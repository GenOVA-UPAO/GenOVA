import { type SyntheticEvent, useState } from "react";

import { Icon } from "@/core/components/icon";
import { Button, Spinner } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

import { totpCodeError } from "../lib/totp-code";
import type { SetupData } from "../lib/types";
import { BackupCodesBox } from "./backup-codes-box";
import { CopyField } from "./copy-field";
import { ErrorAlert } from "./error-alert";

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

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="text-accent-brand">
          <Icon name="shield-check" size="text-lg" />
        </span>
        <h3 className="text-sm font-semibold">Configura tu autenticador</h3>
      </div>
      <ol className="list-inside list-decimal space-y-2 text-xs text-muted-foreground">
        <li>Abre tu app autenticadora y escanea el código QR (o copia la clave manualmente).</li>
        <li>Ingresa el código de 6 dígitos que genera la app para confirmar.</li>
      </ol>
      <div className="space-y-2 rounded-lg bg-muted/40 p-3">
        <CopyField
          label="URI de aprovisionamiento"
          value={data.provisioning_uri}
          ariaLabel="Copiar URI"
        />
        <CopyField label="Clave secreta" value={data.secret} ariaLabel="Copiar clave" mono />
      </div>
      <BackupCodesBox codes={data.backup_codes} />
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="code">Código de verificación</Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            aria-invalid={showError ? true : undefined}
            onChange={(event) => {
              setCode(event.target.value);
            }}
          />
          {showError && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <ErrorAlert message={serverError} />
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isSubmitting || code === ""}>
            {isSubmitting && <Spinner />}
            {isSubmitting ? "Verificando..." : "Confirmar y activar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
