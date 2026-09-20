import { z } from "zod";

import type { AdminUser, UserEditPayload } from "./types";

export interface UserFormValues {
  full_name: string;
  email: string;
  university_id: string;
  gender: string;
  phone_number: string;
}

export interface UserFormErrors {
  full_name?: string;
  email?: string;
}

const EMAIL_SCHEMA = z.email();

function resolveGender(value: string | null | undefined): string {
  if (value !== null && value !== undefined && value !== "") return value;
  return "otro";
}

export function initialUserFormValues(user: AdminUser): UserFormValues {
  return {
    full_name: user.full_name ?? "",
    email: user.email,
    university_id:
      user.university_id !== undefined && user.university_id !== null
        ? String(user.university_id)
        : "",
    gender: resolveGender(user.gender),
    phone_number: user.phone_number ?? "",
  };
}

export function validateUserForm(values: UserFormValues): UserFormErrors {
  const errors: UserFormErrors = {};
  if (values.full_name.trim() === "") errors.full_name = "El nombre es requerido.";
  if (!EMAIL_SCHEMA.safeParse(values.email.trim()).success) errors.email = "Correo inválido.";
  return errors;
}

export function toUserEditPayload(values: UserFormValues): UserEditPayload {
  const parsedId =
    values.university_id !== "" ? Number.parseInt(values.university_id, 10) : Number.NaN;
  return {
    full_name: values.full_name.trim(),
    email: values.email.trim(),
    university_id: Number.isNaN(parsedId) ? null : parsedId,
    gender: values.gender !== "" ? values.gender : null,
    phone_number: values.phone_number.trim() !== "" ? values.phone_number.trim() : null,
  };
}
