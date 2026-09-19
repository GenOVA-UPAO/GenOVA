import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

import type { ProfileFormValues } from "../lib/types";

const LABEL_CLASS = "text-xs font-bold uppercase tracking-wide text-muted-foreground";

interface ProfileContactFieldsProps {
  values: ProfileFormValues;
  errorFor: (field: keyof ProfileFormValues) => string | undefined;
  onChange: (field: keyof ProfileFormValues, value: string) => void;
  onBlur: (field: keyof ProfileFormValues) => void;
  disabled: boolean;
}

export function ProfileContactFields({
  values,
  errorFor,
  onChange,
  onBlur,
  disabled,
}: Readonly<ProfileContactFieldsProps>) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="gender" className={LABEL_CLASS}>
          Sexo / Género
        </Label>
        <select
          id="gender"
          value={values.gender}
          disabled={disabled}
          onChange={(event) => {
            onChange("gender", event.target.value);
          }}
          className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-ring focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:h-8"
        >
          <option value="masculino">Masculino</option>
          <option value="femenino">Femenino</option>
          <option value="otro">Otro / No especificado</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phoneNumber" className={LABEL_CLASS}>
          Teléfono de contacto
        </Label>
        <Input
          id="phoneNumber"
          type="tel"
          autoComplete="tel"
          placeholder="Ej: +51987285992"
          value={values.phone_number}
          disabled={disabled}
          aria-invalid={errorFor("phone_number") ? true : undefined}
          onChange={(event) => {
            onChange("phone_number", event.target.value);
          }}
          onBlur={() => {
            onBlur("phone_number");
          }}
        />
        {errorFor("phone_number") !== undefined && (
          <p className="text-xs font-medium text-destructive">{errorFor("phone_number")}</p>
        )}
      </div>
    </div>
  );
}
