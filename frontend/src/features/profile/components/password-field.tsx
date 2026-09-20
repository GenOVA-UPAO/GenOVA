import { Label } from "@/core/components/ui/label";
import { PasswordInput } from "@/core/components/ui/password-input";

const LABEL_CLASS = "text-xs font-bold uppercase tracking-wide text-muted-foreground";

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  error?: string;
  hint?: string;
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
  disabled,
  onChange,
  onBlur,
}: Readonly<PasswordFieldProps>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </Label>
      <PasswordInput
        id={id}
        placeholder="••••••••"
        value={value}
        disabled={disabled}
        autoComplete="new-password"
        aria-invalid={error !== undefined ? true : undefined}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onBlur={onBlur}
      />
      {hint !== undefined && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error !== undefined && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
