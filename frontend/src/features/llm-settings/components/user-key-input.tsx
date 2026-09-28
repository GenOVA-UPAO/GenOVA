import type { Ref } from "react";

import { Input } from "@/core/components/ui/input";

import { UserKeyRowActions } from "./user-key-row-actions";

interface UserKeyInputProps {
  id: string;
  label: string;
  inputRef: Ref<HTMLInputElement>;
  value: string;
  error: string | null;
  saving: boolean;
  configured: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

/** Campo para pegar la clave: Intro guarda y Esc cancela, como en el resto de la app. */
export function UserKeyInput({
  id,
  label,
  inputRef,
  value,
  error,
  saving,
  configured,
  onChange,
  onSave,
  onCancel,
}: Readonly<UserKeyInputProps>) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          ref={inputRef}
          id={id}
          type="password"
          autoComplete="off"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSave();
            } else if (event.key === "Escape") {
              event.preventDefault();
              onCancel();
            }
          }}
          className="flex-1 font-mono text-xs max-sm:h-11"
        />
        <UserKeyRowActions
          editing
          configured={configured}
          saving={saving}
          onStart={() => undefined}
          onCancel={onCancel}
          onSave={onSave}
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
