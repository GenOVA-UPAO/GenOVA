import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";
import { useState } from "react";

import { Input } from "@/core/components/ui/input";
import { cn } from "@/core/lib/cn";

interface PasswordInputProps extends ComponentProps<"input"> {
  revealable?: boolean;
  revealLabel?: string;
  hideLabel?: string;
}

// React 19: `ref` es un prop normal, ya no hace falta forwardRef.
function PasswordInput({
  className,
  id,
  type = "password",
  revealable = true,
  revealLabel = "Mostrar contraseña",
  hideLabel = "Ocultar contraseña",
  disabled,
  ref,
  ...props
}: Readonly<PasswordInputProps>) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const visible = isPassword && showPassword;

  return (
    <div className="relative">
      <Input
        ref={ref}
        id={id}
        type={visible ? "text" : type}
        disabled={disabled}
        className={cn("pr-10", className)}
        {...props}
      />
      {revealable && isPassword && (
        <RevealToggle
          shown={showPassword}
          disabled={disabled}
          label={showPassword ? hideLabel : revealLabel}
          onToggle={() => {
            setShowPassword((value) => !value);
          }}
        />
      )}
    </div>
  );
}

interface RevealToggleProps {
  shown: boolean;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
}

function RevealToggle({ shown, disabled, label, onToggle }: Readonly<RevealToggleProps>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      aria-label={label}
      title={label}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
    >
      {shown ? (
        <EyeSlashIcon size={18} weight="duotone" aria-hidden="true" />
      ) : (
        <EyeIcon size={18} weight="duotone" aria-hidden="true" />
      )}
    </button>
  );
}

export { PasswordInput };
