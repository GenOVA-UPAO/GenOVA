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
