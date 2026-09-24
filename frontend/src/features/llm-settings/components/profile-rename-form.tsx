import { useEffect, useRef, useState } from "react";

import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";

interface ProfileRenameFormProps {
  id: string;
  initial: string;
  saving: boolean;
  error: string | null;
  onSave: (name: string) => void;
  onCancel: () => void;
}

/** Renombrar en la misma fila: Intro guarda y Esc cancela. */
export function ProfileRenameForm({
  id,
  initial,
  saving,
  error,
  onSave,
  onCancel,
}: Readonly<ProfileRenameFormProps>) {
  const [name, setName] = useState(initial);
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const localError = touched && name.trim() === "" ? "Escribe un nombre para el perfil." : null;
  const shown = localError ?? error;

  useEffect(() => {
    // Tras cerrarse el menú «Más acciones», que devuelve el foco a su botón.
    const timer = window.setTimeout(() => inputRef.current?.select(), 60);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const submit = () => {
    setTouched(true);
    if (name.trim() !== "") onSave(name.trim());
  };

  return (
    <form
      className="grid gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor={id} className="text-xs text-muted-foreground">
        Nuevo nombre
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          ref={inputRef}
          id={id}
          value={name}
          maxLength={60}
          autoComplete="off"
          aria-invalid={shown ? true : undefined}
          aria-describedby={shown ? `${id}-error` : undefined}
          onChange={(event) => {
            setName(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              onCancel();
            }
          }}
          className="flex-1 max-sm:h-11"
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="max-sm:h-11 max-sm:flex-1"
            disabled={saving}
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button type="submit" className="max-sm:h-11 max-sm:flex-1" loading={saving}>
            Guardar
          </Button>
        </div>
      </div>
      {shown ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {shown}
        </p>
      ) : null}
    </form>
  );
}
