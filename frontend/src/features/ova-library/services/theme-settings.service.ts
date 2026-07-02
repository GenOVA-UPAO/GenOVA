import { Injectable } from "@angular/core";
import { apiFetch } from "@/core/lib/http";

@Injectable({ providedIn: "root" })
export class ThemeSettingsService {
  async saveTheme(theme: object): Promise<void> {
    const response = await apiFetch("/api/users/me/theme", {
      method: "PATCH",
      body: JSON.stringify(theme),
    });
    if (response.ok) return;
    let data: { detail?: string; message?: string } = {};
    try {
      data = await response.json();
    } catch {
      /* ignore */
    }
    throw new Error(data.detail || data.message || "No se pudo guardar el tema.");
  }
}
