import { apiJson } from "@/core/lib/http";

import type { SetupData } from "../lib/types";

export function startTotpSetup(): Promise<SetupData> {
  return apiJson<SetupData>(
    "/api/auth/totp/setup",
    { method: "POST" },
    { fallbackMsg: "Error al iniciar la configuración." },
  );
}

export function confirmTotpSetup(code: string): Promise<void> {
  return apiJson(
    "/api/auth/totp/confirm",
    { method: "POST", body: JSON.stringify({ code }) },
    { fallbackMsg: "Código incorrecto." },
  ).then(() => undefined);
}

export function disableTotp(code: string): Promise<void> {
  return apiJson(
    "/api/auth/totp",
    { method: "DELETE", body: JSON.stringify({ code: code.trim() }) },
    { fallbackMsg: "Código incorrecto." },
  ).then(() => undefined);
}
