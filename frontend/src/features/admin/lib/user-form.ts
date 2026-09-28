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
  phone_number?: string;
  university_id?: string;
}

const PHONE_RE = /^\+?\d+$/;

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
  // Mismos mensajes que el formulario de «Mi perfil».
  if (values.full_name.trim() === "") errors.full_name = "El nombre completo es requerido.";
  if (!EMAIL_SCHEMA.safeParse(values.email.trim()).success) {
    errors.email = "Ingresa un correo electrónico válido.";
  }
  if (!/^\d*$/.test(values.university_id.trim())) {
    errors.university_id = "El código solo debe contener números.";
  }
  const phone = values.phone_number.trim();
  if (phone !== "" && !PHONE_RE.test(phone)) {
    errors.phone_number = "El teléfono solo debe contener dígitos y el signo +.";
  }
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
