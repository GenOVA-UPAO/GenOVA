import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

import type { UserFormValues } from "../../lib/user-form";

const LABEL_CLASS = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

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
      <div className="space-y-1.5">
        <Label htmlFor="edit-gender" className={LABEL_CLASS}>
          Sexo / Género
        </Label>
        <select
          id="edit-gender"
          value={values.gender}
          disabled={disabled}
          onChange={(event) => {
            onChange("gender", event.target.value);
          }}
          className="flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:h-8"
        >
          <option value="masculino">Masculino</option>
          <option value="femenino">Femenino</option>
          <option value="otro">Otro</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-phone" className={LABEL_CLASS}>
          Teléfono
        </Label>
        <Input
          id="edit-phone"
          type="tel"
          placeholder="Ej: +51987285992"
          value={values.phone_number}
          disabled={disabled}
          onChange={(event) => {
            onChange("phone_number", event.target.value);
          }}
        />
      </div>
    </div>
  );
}
