import { useId } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

interface TotpCodeFieldProps {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

/** Código 2FA exigido al cambiar el correo de una cuenta con TOTP activo. */
export function TotpCodeField({ value, disabled, onChange }: Readonly<TotpCodeFieldProps>) {
  const { t } = useTranslation("profile");
  const id = useId();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t("totpField.label")}</Label>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        disabled={disabled}
        className="max-w-40 tabular-nums"
        onChange={(e) => {
          onChange(e.target.value.replace(/\D/g, ""));
        }}
      />
      <p className="text-xs text-muted-foreground">{t("totpField.hint")}</p>
    </div>
  );
}
