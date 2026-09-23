import { PasswordInput } from "@/core/components/ui/password-input";

import { describedBy } from "../lib/described-by";
import { FormField } from "./form-field";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  hint?: string;
  autoComplete: "current-password" | "new-password";
  disabled: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
}

export function PasswordField({
  id,
  label,
  value,
  error,
  hint,
  autoComplete,
  disabled,
  onChange,
  onBlur,
}: Readonly<PasswordFieldProps>) {
  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      <PasswordInput
        id={id}
        value={value}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={error !== undefined ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onBlur={onBlur}
      />
    </FormField>
  );
}
