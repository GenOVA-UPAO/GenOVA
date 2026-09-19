import { type Ref, useId, useState } from "react";

import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

interface PlatformKeyInputProps {
  label: string;
  value: string;
  placeholder: string;
  editing: boolean;
  ref: Ref<HTMLInputElement>;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function PlatformKeyInput({
  label,
  value,
  placeholder,
  editing,
  ref,
  onChange,
  onSubmit,
}: Readonly<PlatformKeyInputProps>) {
  const inputId = useId();
  const [show, setShow] = useState(false);

  return (
    <div className="relative flex-1">
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        ref={ref}
        type={show ? "text" : "password"}
        value={value}
        placeholder={placeholder}
        readOnly={!editing}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && editing) onSubmit();
        }}
        className={cn(
          "w-full rounded-xl border border-border/50 px-4 py-2.5 pr-10 font-mono text-xs transition outline-none",
          editing
            ? "bg-background shadow-sm focus:ring-2 focus:ring-primary/20"
            : "bg-muted/30 text-muted-foreground",
        )}
      />
      <button
        type="button"
        onClick={() => {
          setShow((v) => !v);
        }}
        disabled={!editing}
        aria-label={show ? "Ocultar clave" : "Mostrar clave"}
        className={cn(
          "absolute top-1/2 right-3 -translate-y-1/2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          editing
            ? "cursor-pointer text-primary hover:text-primary/80"
            : "text-muted-foreground/50",
        )}
      >
        <Icon name={show ? "eye" : "eye-slash"} size="text-base" />
      </button>
    </div>
  );
}
