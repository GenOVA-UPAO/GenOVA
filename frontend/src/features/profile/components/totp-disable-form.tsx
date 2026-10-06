import { type SyntheticEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";

import { describedBy } from "../lib/described-by";
import { FormField } from "./form-field";

interface TotpDisableFormProps {
  isDisabling: boolean;
  onDisable: (code: string) => void;
  onCancel: () => void;
}

/** Confirmación con un código actual antes de quitar la verificación en dos pasos. */
export function TotpDisableForm({
  isDisabling,
  onDisable,
  onCancel,
}: Readonly<TotpDisableFormProps>) {
  const { t } = useTranslation("profile");
  const [code, setCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // El formulario se abre a petición del usuario: el foco va directo al código.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const [tried, setTried] = useState(false);
  const clean = code.trim();
  const codeHint = t("totp.disableCodeHint");
  const codeError =
    tried && !/^\d{6}$/.test(clean) ? t("totp.disableCodeError") : undefined;

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
        <FormField id="disable-code" label={t("totp.disableCodeLabel")} hint={codeHint} error={codeError}>
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
            aria-describedby={describedBy("disable-code", codeError, codeHint)}
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
          {t("totp.cancel")}
        </Button>
        <Button type="submit" variant="danger" className="max-sm:h-11" loading={isDisabling}>
          {t("totp.disableSubmit")}
        </Button>
      </div>
    </form>
  );
}
