import { Input } from "@/core/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

import { describedBy } from "../lib/described-by";
import type { ProfileFormValues } from "../lib/types";
import { FormField } from "./form-field";

const PHONE_HINT = "Con prefijo de país, por ejemplo +51987285992.";

const GENDER_OPTIONS = [
  { value: "masculino", label: "Masculino" },
  { value: "femenino", label: "Femenino" },
  { value: "otro", label: "Otro o prefiero no decirlo" },
];

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
  const phoneError = errorFor("phone_number");

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <FormField id="gender" label="Sexo">
        <Select
          value={values.gender}
          disabled={disabled}
          onValueChange={(value) => {
            onChange("gender", value);
          }}
        >
          <SelectTrigger id="gender" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {GENDER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField id="phoneNumber" label="Teléfono de contacto" hint={PHONE_HINT} error={phoneError}>
        <Input
          id="phoneNumber"
          type="tel"
          autoComplete="tel"
          value={values.phone_number}
          disabled={disabled}
          aria-invalid={phoneError ? true : undefined}
          aria-describedby={describedBy("phoneNumber", phoneError, PHONE_HINT)}
          onChange={(event) => {
            onChange("phone_number", event.target.value);
          }}
          onBlur={() => {
            onBlur("phone_number");
          }}
        />
      </FormField>
    </div>
  );
}
