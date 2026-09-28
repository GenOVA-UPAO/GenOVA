import { apiJson } from "@/core/lib/http";

import type { ChangePasswordValues, ProfileData, ProfileFormValues } from "../lib/types";

const json = (body: unknown) => JSON.stringify(body);

function parseUniversityId(value: string): number | null {
  if (value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function fetchProfile(): Promise<ProfileData> {
  return apiJson<ProfileData>(
    "/api/auth/me",
    {},
    { fallbackMsg: "No se pudo cargar la información de perfil." },
  );
}

export function saveProfile(values: ProfileFormValues): Promise<ProfileData> {
  return apiJson<ProfileData>(
    "/api/users/me",
    {
      method: "PATCH",
      body: json({
        full_name: values.full_name.trim(),
        email: values.email.trim().toLowerCase(),
        university_id: parseUniversityId(values.university_id),
        gender: values.gender !== "" ? values.gender : null,
        phone_number: values.phone_number.trim() !== "" ? values.phone_number.trim() : null,
      }),
    },
    { fallbackMsg: "Error al actualizar el perfil." },
  );
}

export function changePassword(values: ChangePasswordValues): Promise<void> {
  return apiJson(
    "/api/users/me/change-password",
    {
      method: "POST",
      body: json({
        current_password: values.currentPassword,
        new_password: values.newPassword,
        confirm_password: values.confirmPassword,
      }),
    },
    { fallbackMsg: "Error al actualizar la contraseña." },
  ).then(() => undefined);
}

export function deleteAccount(password: string): Promise<void> {
  return apiJson(
    "/api/users/me",
    { method: "DELETE", body: json({ password }) },
    { fallbackMsg: "Error al eliminar la cuenta." },
  ).then(() => undefined);
}
