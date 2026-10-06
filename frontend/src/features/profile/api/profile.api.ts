import { t } from "i18next";

import { apiJson } from "@/core/lib/http";

import type { ChangePasswordValues, ProfileData, ProfileSaveValues } from "../lib/types";

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
    { fallbackMsg: t("profile:api.loadProfile") },
  );
}

export function saveProfile(values: ProfileSaveValues): Promise<ProfileData> {
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
        ...(values.current_password ? { current_password: values.current_password } : {}),
        ...(values.totp_code ? { totp_code: values.totp_code } : {}),
      }),
    },
    { fallbackMsg: t("profile:api.updateProfile") },
  );
}

export function confirmEmailChange(token: string): Promise<ProfileData> {
  return apiJson<ProfileData>("/api/users/me/email/confirm", {
    method: "POST", body: json({ token }),
  }, { fallbackMsg: t("profile:api.invalidCode") });
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
    { fallbackMsg: t("profile:password.updateError") },
  ).then(() => undefined);
}

export function deleteAccount(password: string): Promise<void> {
  return apiJson(
    "/api/users/me",
    { method: "DELETE", body: json({ password }) },
    { fallbackMsg: t("profile:delete.error") },
  ).then(() => undefined);
}
