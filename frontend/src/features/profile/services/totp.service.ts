import { Injectable } from "@angular/core";

import { apiFetch } from "@/core/lib/http";

import type { SetupData } from "../components/totp-setup-card.types";

@Injectable({ providedIn: "root" })
export class TotpService {
  async startSetup(): Promise<SetupData> {
    const res = await apiFetch("/api/auth/totp/setup", { method: "POST" });
    const data = (await res.json()) as SetupData & { message?: string };
    if (res.status !== 200) {
      throw new Error(data?.message || "Error al iniciar la configuración.");
    }
    return data;
  }

  async confirmSetup(code: string): Promise<void> {
    const res = await apiFetch("/api/auth/totp/confirm", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    const data = (await res.json()) as { message?: string };
    if (res.status !== 200) {
      throw new Error(data?.message || "Código incorrecto.");
    }
  }

  async disable(code: string): Promise<void> {
    const res = await apiFetch("/api/auth/totp", {
      method: "DELETE",
      body: JSON.stringify({ code: code.trim() }),
    });
    const data = (await res.json()) as { message?: string };
    if (res.status !== 200) {
      throw new Error(data?.message || "Código incorrecto.");
    }
  }
}
