import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

import type { ProfileFormValues } from "../lib/types";

const LABEL_CLASS = "text-xs font-bold uppercase tracking-wide text-muted-foreground";

interface ProfileIdentityFieldsProps {
  values: ProfileFormValues;
  errorFor: (field: keyof ProfileFormValues) => string | undefined;
  onChange: (field: keyof ProfileFormValues, value: string) => void;
  onBlur: (field: keyof ProfileFormValues) => void;
  disabled: boolean;
}

export function ProfileIdentityFields({
  values,
  errorFor,
  onChange,
  onBlur,
  disabled,
}: Readonly<ProfileIdentityFieldsProps>) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="fullName" className={LABEL_CLASS}>
          Nombre Completo
        </Label>
        <Input
          id="fullName"
          type="text"
          autoComplete="name"
          placeholder="Ej: Juan Pérez"
          value={values.full_name}
          disabled={disabled}
          aria-invalid={errorFor("full_name") ? true : undefined}
          onChange={(event) => {
            onChange("full_name", event.target.value);
          }}
          onBlur={() => {
            onBlur("full_name");
          }}
        />
        {errorFor("full_name") !== undefined && (
          <p className="text-xs font-medium text-destructive">{errorFor("full_name")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className={LABEL_CLASS}>
          Correo Electrónico
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="usuario@correo.com"
          value={values.email}
          disabled={disabled}
          aria-invalid={errorFor("email") ? true : undefined}
          onChange={(event) => {
            onChange("email", event.target.value);
          }}
          onBlur={() => {
            onBlur("email");
          }}
        />
        {errorFor("email") !== undefined && (
          <p className="text-xs font-medium text-destructive">{errorFor("email")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="universityId" className={LABEL_CLASS}>
          Código Universitario (UPAO)
        </Label>
        <Input
          id="universityId"
          type="text"
          inputMode="numeric"
          placeholder="Ej: 257022"
          value={values.university_id}
          disabled={disabled}
          onChange={(event) => {
            onChange("university_id", event.target.value);
          }}
        />
        <p className="text-[10px] text-muted-foreground">
          Se autocompletará con ceros a la izquierda a 9 dígitos al guardarse.
        </p>
      </div>
    </>
  );
}
