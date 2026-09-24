import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

import { fieldDescribedBy } from "../../lib/field-described-by";
import type { UserFormErrors, UserFormValues } from "../../lib/user-form";
import { FieldMessage } from "./field-message";

// Mismas opciones y textos que el formulario de «Mi perfil».
const GENDER_OPTIONS = [
  { value: "masculino", label: "Masculino" },
  { value: "femenino", label: "Femenino" },
  { value: "otro", label: "Otro o prefiere no decirlo" },
];

const PHONE_HINT = "Con prefijo de país, por ejemplo +51987285992.";

interface EditUserContactFieldsProps {
  values: UserFormValues;
  errors: UserFormErrors;
  disabled: boolean;
  onChange: (field: keyof UserFormValues, value: string) => void;
}

export function EditUserContactFields({
  values,
  errors,
  disabled,
  onChange,
}: Readonly<EditUserContactFieldsProps>) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="edit-gender">Sexo</Label>
        <Select
          value={values.gender}
          disabled={disabled}
          onValueChange={(value) => {
            onChange("gender", value);
          }}
        >
          <SelectTrigger id="edit-gender" className="w-full">
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-phone">Teléfono de contacto</Label>
        <Input
          id="edit-phone"
          type="tel"
          autoComplete="off"
          value={values.phone_number}
          disabled={disabled}
          aria-invalid={errors.phone_number !== undefined || undefined}
          aria-describedby={fieldDescribedBy("edit-phone", errors.phone_number, PHONE_HINT)}
          onChange={(event) => {
            onChange("phone_number", event.target.value);
          }}
        />
        <FieldMessage id="edit-phone" error={errors.phone_number} hint={PHONE_HINT} />
      </div>
    </div>
  );
}
