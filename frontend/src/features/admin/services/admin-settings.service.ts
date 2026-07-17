import { Injectable } from "@angular/core";

import { apiJson } from "../../../core/lib/http";

@Injectable({ providedIn: "root" })
export class AdminSettingsService {
  getRegistrationMode(): Promise<{ default_registration_role?: string }> {
    return apiJson<{ default_registration_role?: string }>("/api/admin/registration-mode", {}, {
      fallbackMsg: "No se pudo cargar el modo de registro.",
    });
  }

  setRegistrationMode(default_registration_role: string): Promise<void> {
    return apiJson(
      "/api/admin/registration-mode",
      { method: "PUT", body: JSON.stringify({ default_registration_role }) },
      { fallbackMsg: "No se pudo guardar el modo de registro." },
    ).then(() => undefined);
  }
}
