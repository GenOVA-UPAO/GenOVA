import { t } from "i18next";
import { useState } from "react";

import type { ProfileData, ProfileFormValues, ProfileSaveValues } from "../lib/types";

/**
 * Cambiar el correo mueve el canal de recuperación de la cuenta: el servidor exige la
 * contraseña actual. Este hook decide cuándo pedirla y la adjunta al guardar.
 */
export function useEmailChange(profile: ProfileData | null, values: ProfileFormValues) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const emailChanged =
    values.email.trim().toLowerCase() !== (profile?.email ?? "").trim().toLowerCase();

  /** `false` si falta la contraseña (y deja el error visible). */
  const validate = (): boolean => {
    if (emailChanged && currentPassword === "") {
      setPasswordError(t("profile:emailChange.passwordRequired"));
      return false;
    }
    if (emailChanged && profile?.totp_enabled && !/^\d{6}$/.test(totpCode)) {
      setPasswordError(t("profile:emailChange.totpRequired"));
      return false;
    }
    setPasswordError(undefined);
    return true;
  };

  const withPassword = (): ProfileSaveValues =>
    emailChanged ? { ...values, current_password: currentPassword, totp_code: totpCode || undefined } : values;

  return {
    emailChanged,
    currentPassword,
    totpCode,
    setTotpCode,
    setCurrentPassword,
    passwordError,
    validate,
    withPassword,
    clear: () => {
      setCurrentPassword("");
      setTotpCode("");
    },
  };
}
