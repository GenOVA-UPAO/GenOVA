import { Input } from "@/core/components/ui/input";

import { describedBy } from "../lib/described-by";
import type { ProfileFormValues } from "../lib/types";
import { FormField } from "./form-field";

const UNI_HINT = "Solo números, sin espacios ni guiones.";

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
  const nameError = errorFor("full_name");
  const emailError = errorFor("email");
  const uniError = errorFor("university_id");

  return (
    <>
      <FormField id="fullName" label="Nombre completo" error={nameError}>
        <Input
          id="fullName"
          type="text"
          autoComplete="name"
          value={values.full_name}
          disabled={disabled}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={describedBy("fullName", nameError)}
          onChange={(event) => {
            onChange("full_name", event.target.value);
          }}
          onBlur={() => {
            onBlur("full_name");
          }}
        />
      </FormField>

      <FormField id="email" label="Correo electrónico" error={emailError}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={values.email}
          disabled={disabled}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={describedBy("email", emailError)}
          onChange={(event) => {
            onChange("email", event.target.value);
          }}
          onBlur={() => {
            onBlur("email");
          }}
        />
      </FormField>

      <FormField id="universityId" label="Código universitario (UPAO)" hint={UNI_HINT} error={uniError}>
        <Input
          id="universityId"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={values.university_id}
          disabled={disabled}
          aria-invalid={uniError ? true : undefined}
          aria-describedby={describedBy("universityId", uniError, UNI_HINT)}
          onChange={(event) => {
            onChange("university_id", event.target.value);
          }}
          onBlur={() => {
            onBlur("university_id");
          }}
        />
      </FormField>
    </>
  );
}
