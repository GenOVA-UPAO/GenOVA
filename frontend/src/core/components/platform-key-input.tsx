import { type Ref, useId, useState } from "react";

import { Icon } from "@/core/components/icon";
import { Input } from "@/core/components/ui/input";

interface PlatformKeyInputProps {
  label: string;
  value: string;
  placeholder: string;
  ref: Ref<HTMLInputElement>;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function PlatformKeyInput({
  label,
  value,
  placeholder,
  ref,
  onChange,
  onSubmit,
}: Readonly<PlatformKeyInputProps>) {
  const inputId = useId();
  const [show, setShow] = useState(false);

  return (
    <div className="flex-1 space-y-1.5">
      <label htmlFor={inputId} className="text-xs text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          id={inputId}
          ref={ref}
          type={show ? "text" : "password"}
          autoComplete="off"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
          className="pr-10 font-mono text-xs max-sm:h-11"
        />
        <button
          type="button"
          onClick={() => {
            setShow((v) => !v);
          }}
          aria-label={show ? "Ocultar clave" : "Mostrar clave"}
          className="absolute top-1/2 right-1.5 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <Icon name={show ? "eye-slash" : "eye"} size="text-base" />
        </button>
      </div>
    </div>
  );
}
