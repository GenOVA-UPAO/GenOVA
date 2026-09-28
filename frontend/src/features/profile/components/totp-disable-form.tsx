import { type SyntheticEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";

import { describedBy } from "../lib/described-by";
import { FormField } from "./form-field";

const CODE_HINT = "El código de 6 dígitos que muestra ahora tu app autenticadora.";

interface TotpDisableFormProps {
  isDisabling: boolean;
  onDisable: (code: string) => void;
  onCancel: () => void;
}

/** Confirmación con un código actual antes de quitar la verificación en dos pasos. */
export function TotpDisableForm({ isDisabling, onDisable, onCancel }: Readonly<TotpDisableFormProps>) {
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // El formulario se abre a petición del usuario: el foco va directo al código.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const [tried, setTried] = useState(false);
  const clean = code.trim();
  const codeError = tried && !/^\d{6}$/.test(clean) ? "Escribe los 6 dígitos del código." : undefined;

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTried(true);
    if (/^\d{6}$/.test(clean)) {
      onDisable(clean);
      return;
    }
    inputRef.current?.focus();
  };

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4 border-t border-border pt-5">
      <div className="sm:w-72">
        <FormField id="disable-code" label="Código de tu app" hint={CODE_HINT} error={codeError}>
          <Input
            id="disable-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            spellCheck={false}
            maxLength={6}
            ref={inputRef}
            value={code}
            disabled={isDisabling}
            aria-invalid={codeError ? true : undefined}
            aria-describedby={describedBy("disable-code", codeError, CODE_HINT)}
            onChange={(event) => {
              setCode(event.target.value);
            }}
          />
        </FormField>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button
          type="button"
          variant="ghost"
          className="max-sm:h-11"
          disabled={isDisabling}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit" variant="danger" className="max-sm:h-11" loading={isDisabling}>
          Desactivar verificación
        </Button>
      </div>
    </form>
  );
}
