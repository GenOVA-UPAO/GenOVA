import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

import type { UserFormValues } from "../../lib/user-form";

const GENDER_OPTIONS = [
  { value: "masculino", label: "Masculino" },
  { value: "femenino", label: "Femenino" },
  { value: "otro", label: "Otro o sin especificar" },
];

interface EditUserContactFieldsProps {
  values: UserFormValues;
  disabled: boolean;
  onChange: (field: keyof UserFormValues, value: string) => void;
}

export function EditUserContactFields({
  values,
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
        <Label htmlFor="edit-phone">Teléfono</Label>
        <Input
          id="edit-phone"
          type="tel"
          autoComplete="off"
          aria-describedby="edit-phone-help"
          value={values.phone_number}
          disabled={disabled}
          onChange={(event) => {
            onChange("phone_number", event.target.value);
          }}
        />
        <p id="edit-phone-help" className="text-xs text-muted-foreground">
          Con prefijo de país, p. ej. +51987285992.
        </p>
      </div>
    </div>
  );
}
