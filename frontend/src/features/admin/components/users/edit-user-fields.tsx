import { Icon } from "@/core/components/icon";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

import type { UserFormErrors, UserFormValues } from "../../lib/user-form";

const LABEL_CLASS = "text-xs font-bold uppercase tracking-wider text-muted-foreground";

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
      <div className="space-y-1.5">
        <Label htmlFor="edit-full-name" className={LABEL_CLASS}>
          Nombre Completo
        </Label>
        <Input
          id="edit-full-name"
          type="text"
          placeholder="Ej: Juan Pérez"
          value={values.full_name}
          disabled={disabled}
          onChange={(event) => {
            onChange("full_name", event.target.value);
          }}
        />
        {errors.full_name !== undefined && (
          <p className="text-xs text-destructive">{errors.full_name}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-email" className={LABEL_CLASS}>
          Correo Electrónico
        </Label>
        <Input
          id="edit-email"
          type="email"
          placeholder="ejemplo@correo.com"
          value={values.email}
          disabled={disabled}
          onChange={(event) => {
            onChange("email", event.target.value);
          }}
        />
        {errors.email !== undefined && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-uni-id" className={LABEL_CLASS}>
          Código Universitario (UPAO)
        </Label>
        <Input
          id="edit-uni-id"
          type="text"
          inputMode="numeric"
          placeholder="Ej: 257022"
          value={values.university_id}
          disabled={disabled}
          onChange={(event) => {
            onChange("university_id", event.target.value);
          }}
        />
        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Icon name="info" size="text-xs" />
          Se autocompletará con ceros a la izquierda a 9 dígitos.
        </p>
      </div>
    </>
  );
}
