import type { ChangePasswordValues } from "../lib/types";
import { PasswordField } from "./password-field";

interface PasswordChangeFieldsProps {
  values: ChangePasswordValues;
  errorFor: (field: keyof ChangePasswordValues) => string | undefined;
  onChange: (field: keyof ChangePasswordValues, value: string) => void;
  onBlur: (field: keyof ChangePasswordValues) => void;
  disabled: boolean;
}

export function PasswordChangeFields({
  values,
  errorFor,
  onChange,
  onBlur,
  disabled,
}: Readonly<PasswordChangeFieldsProps>) {
  return (
    <div className="grid grid-cols-1 gap-6">
      <PasswordField
        id="currentPassword"
        label="Contraseña Actual"
        value={values.currentPassword}
        error={errorFor("currentPassword")}
        disabled={disabled}
        onChange={(value) => {
          onChange("currentPassword", value);
        }}
        onBlur={() => {
          onBlur("currentPassword");
        }}
      />
      <PasswordField
        id="newPassword"
        label="Nueva Contraseña"
        value={values.newPassword}
        error={errorFor("newPassword")}
        hint="Mínimo 8 caracteres alfanuméricos (letras y números)"
        disabled={disabled}
        onChange={(value) => {
          onChange("newPassword", value);
        }}
        onBlur={() => {
          onBlur("newPassword");
        }}
      />
      <PasswordField
        id="confirmPassword"
        label="Confirmar Nueva Contraseña"
        value={values.confirmPassword}
        error={errorFor("confirmPassword")}
        disabled={disabled}
        onChange={(value) => {
          onChange("confirmPassword", value);
        }}
        onBlur={() => {
          onBlur("confirmPassword");
        }}
      />
    </div>
  );
}
