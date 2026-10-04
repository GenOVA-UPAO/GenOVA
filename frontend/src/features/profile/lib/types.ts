export interface ProfileData {
  id?: string | number;
  full_name?: string | null;
  email?: string | null;
  university_id?: string | number | null;
  gender?: string | null;
  phone_number?: string | null;
  role?: string | null;
  created_at?: string | null;
  totp_enabled?: boolean;
  [key: string]: unknown;
}

export interface ProfileFormValues {
  full_name: string;
  email: string;
  university_id: string;
  gender: string;
  phone_number: string;
}

/** Valores a guardar: la contraseña actual solo se exige si cambia el correo. */
export type ProfileSaveValues = ProfileFormValues & { current_password?: string; totp_code?: string };

export interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SetupData {
  provisioning_uri: string;
  secret: string;
  backup_codes?: string[];
}

export type TotpPhase = "idle" | "setup" | "enabled";
