import { Injectable, signal } from "@angular/core";
import { apiFetch } from "../../../core/lib/http";

export interface ProfileData {
  full_name?: string;
  email?: string;
  university_id?: string | number;
  gender?: string;
  phone_number?: string;
  role?: string;
  created_at?: string;
  totp_enabled?: boolean;
}

export interface ProfileFormValues {
  full_name: string;
  email: string;
  university_id?: string;
  gender?: string;
  phone_number?: string;
}

export interface ChangePasswordValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

@Injectable({
  providedIn: "root",
})
export class ProfileService {
  profileData = signal<ProfileData | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  getInitials(fullName?: string): string {
    if (!fullName) return "U";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }

  formatDate(isoString?: string): string {
    if (!isoString) return "-";
    return new Date(isoString).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  async loadProfile() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const response = await apiFetch("/api/auth/me");
      if (response.status !== 200) {
        throw new Error("No se pudo cargar la información de perfil.");
      }
      const data = await response.json();
      this.profileData.set(data);
    } catch (e: any) {
      this.error.set(e.message);
    } finally {
      this.loading.set(false);
    }
  }

  async saveProfile(values: ProfileFormValues): Promise<boolean> {
    const response = await apiFetch("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify({
        full_name: values.full_name.trim(),
        email: values.email.trim().toLowerCase(),
        university_id: values.university_id ? Number.parseInt(values.university_id, 10) : null,
        gender: values.gender || null,
        phone_number: values.phone_number?.trim() || null,
      }),
    });
    if (response.status === 200) {
      await this.loadProfile();
      return true;
    }
    let data2: any = {};
    try {
      data2 = await response.json();
    } catch {}
    throw new Error(data2.detail || "Error al actualizar el perfil.");
  }

  async changePassword(values: ChangePasswordValues): Promise<boolean> {
    const response = await apiFetch("/api/users/me/change-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: values.currentPassword,
        new_password: values.newPassword,
        confirm_password: values.confirmPassword,
      }),
    });
    if (response.status === 200) {
      return true;
    }
    let data: any = {};
    try {
      data = await response.json();
    } catch {}
    throw new Error(data.detail || "Error al actualizar la contraseña.");
  }

  async deleteAccount(): Promise<boolean> {
    const response = await apiFetch("/api/users/me", {
      method: "DELETE",
    });
    if (response.status === 200) {
      return true;
    }
    let data: any = {};
    try {
      data = await response.json();
    } catch {}
    throw new Error(data.detail || "Error al eliminar la cuenta.");
  }
}
