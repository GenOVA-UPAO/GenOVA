import { useState } from "react";

import type { ProfileData, ProfileFormValues, ProfileSaveValues } from "../lib/types";

/**
 * Cambiar el correo mueve el canal de recuperación de la cuenta: el servidor exige la
 * contraseña actual. Este hook decide cuándo pedirla y la adjunta al guardar.
 */
export function useEmailChange(profile: ProfileData | null, values: ProfileFormValues) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const emailChanged =
    values.email.trim().toLowerCase() !== (profile?.email ?? "").trim().toLowerCase();

  /** `false` si falta la contraseña (y deja el error visible). */
  const validate = (): boolean => {
    if (emailChanged && currentPassword === "") {
      setPasswordError("Ingresa tu contraseña actual para cambiar el correo.");
      return false;
    }
    setPasswordError(undefined);
    return true;
  };

  const withPassword = (): ProfileSaveValues =>
    emailChanged ? { ...values, current_password: currentPassword } : values;

  return {
    emailChanged,
    currentPassword,
    setCurrentPassword,
    passwordError,
    validate,
    withPassword,
    clear: () => {
      setCurrentPassword("");
    },
  };
}
