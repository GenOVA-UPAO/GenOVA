import { t } from "i18next";

import { apiJson } from "@/core/lib/http";

import type { SetupData } from "../lib/types";

export function startTotpSetup(): Promise<SetupData> {
  return apiJson<SetupData>(
    "/api/auth/totp/setup",
    { method: "POST" },
    { fallbackMsg: t("profile:totp.setupStartError") },
  );
}

export function confirmTotpSetup(code: string): Promise<void> {
  return apiJson(
    "/api/auth/totp/confirm",
    { method: "POST", body: JSON.stringify({ code }) },
    { fallbackMsg: t("profile:totp.wrongCode") },
  ).then(() => undefined);
}

export function disableTotp(code: string): Promise<void> {
  return apiJson(
    "/api/auth/totp",
    { method: "DELETE", body: JSON.stringify({ code: code.trim() }) },
    { fallbackMsg: t("profile:totp.wrongCode") },
  ).then(() => undefined);
}
