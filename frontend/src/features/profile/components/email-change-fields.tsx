import type { useEmailChange } from "../hooks/use-email-change";
import { PasswordField } from "./password-field";
import { TotpCodeField } from "./totp-code-field";

interface EmailChangeFieldsProps {
  emailChange: ReturnType<typeof useEmailChange>;
  totpEnabled: boolean;
  disabled: boolean;
}

/** Reautenticación al cambiar el correo: contraseña actual y, con 2FA, código TOTP. */
export function EmailChangeFields({
  emailChange,
  totpEnabled,
  disabled,
}: Readonly<EmailChangeFieldsProps>) {
  if (!emailChange.emailChanged) return null;
  return (
    <>
      <PasswordField
        id="emailChangePassword"
        label="Contraseña actual"
        hint="Necesaria para cambiar el correo de tu cuenta."
        value={emailChange.currentPassword}
        error={emailChange.passwordError}
        autoComplete="current-password"
        disabled={disabled}
        onChange={emailChange.setCurrentPassword}
        onBlur={() => undefined}
      />
      {totpEnabled && (
        <TotpCodeField
          value={emailChange.totpCode}
          disabled={disabled}
          onChange={emailChange.setTotpCode}
        />
      )}
    </>
  );
}
