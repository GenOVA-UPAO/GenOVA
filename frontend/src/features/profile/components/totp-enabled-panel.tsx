import { useState } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

import { ErrorAlert } from "./error-alert";

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

  return (
    <div className="space-y-3 rounded-xl border border-green-500/30 bg-card p-5">
      <div className="flex items-center gap-2">
        <span className="text-success">
          <Icon name="shield-check" size="text-lg" />
        </span>
        <h3 className="text-sm font-semibold">Autenticación en 2 pasos activada</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Tu cuenta está protegida. Para desactivar, confirma con un código de tu autenticador.
      </p>
      <div className="flex items-end gap-2">
        <div className="max-w-[160px] flex-1 space-y-1">
          <Label htmlFor="disable-code" className="text-xs font-medium">
            Código actual
          </Label>
          <Input
            id="disable-code"
            type="text"
            inputMode="numeric"
            placeholder="123456"
            maxLength={6}
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
            }}
          />
        </div>
        <Button
          variant="destructive"
          disabled={isDisabling || code.length < 6}
          onClick={() => {
            onDisable(code);
          }}
        >
          {isDisabling ? "Desactivando..." : "Desactivar 2FA"}
        </Button>
      </div>
      <ErrorAlert message={serverError} />
    </div>
  );
}
