import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

import type { UserFormErrors, UserFormValues } from "../../lib/user-form";

interface EditUserFieldsProps {
  values: UserFormValues;
  errors: UserFormErrors;
  disabled: boolean;
  onChange: (field: keyof UserFormValues, value: string) => void;
}

export function EditUserFields({
  values,
  errors,
  disabled,
  onChange,
}: Readonly<EditUserFieldsProps>) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="edit-full-name">Nombre completo</Label>
        <Input
          id="edit-full-name"
          type="text"
          autoComplete="off"
          value={values.full_name}
          disabled={disabled}
          aria-invalid={errors.full_name !== undefined || undefined}
          aria-describedby={errors.full_name !== undefined ? "edit-full-name-error" : undefined}
          onChange={(event) => {
            onChange("full_name", event.target.value);
          }}
        />
        {errors.full_name !== undefined && (
          <p id="edit-full-name-error" className="text-xs text-destructive">
            {errors.full_name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-email">Correo electrónico</Label>
        <Input
          id="edit-email"
          type="email"
          autoComplete="off"
          value={values.email}
          disabled={disabled}
          aria-invalid={errors.email !== undefined || undefined}
          aria-describedby={errors.email !== undefined ? "edit-email-error" : undefined}
          onChange={(event) => {
            onChange("email", event.target.value);
          }}
        />
        {errors.email !== undefined && (
          <p id="edit-email-error" className="text-xs text-destructive">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-uni-id">Código universitario (UPAO)</Label>
        <Input
          id="edit-uni-id"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-describedby="edit-uni-id-help"
          value={values.university_id}
          disabled={disabled}
          onChange={(event) => {
            onChange("university_id", event.target.value);
          }}
        />
        <p id="edit-uni-id-help" className="text-xs text-muted-foreground">
          Solo números. Al guardar se completa con ceros a la izquierda hasta 9 dígitos.
        </p>
      </div>
    </>
  );
}
