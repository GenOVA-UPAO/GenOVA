import { Injectable } from "@angular/core";

import { apiGetJson, apiPutJson } from "../../../core/lib/http";

@Injectable({ providedIn: "root" })
export class AdminSettingsService {
  getRegistrationMode(): Promise<{ default_registration_role?: string }> {
    return apiGetJson(
      "/api/admin/registration-mode",
      "No se pudo cargar el modo de registro.",
    ) as Promise<{ default_registration_role?: string }>;
  }

  setRegistrationMode(default_registration_role: string): Promise<void> {
    return apiPutJson(
      "/api/admin/registration-mode",
      { default_registration_role },
      "No se pudo guardar el modo de registro.",
    ).then(() => undefined);
  }
}
