import { t } from "i18next";

import { apiFetch } from "@/core/lib/http";

interface VerifyResponse {
  message?: string;
  [key: string]: unknown;
}

async function readMessage(res: Response): Promise<VerifyResponse> {
  return (await res.json().catch(() => ({}))) as VerifyResponse;
}

export async function verifyEmail(token: string): Promise<VerifyResponse> {
  const res = await apiFetch("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  const data = await readMessage(res);
  if (!res.ok) {
    throw new Error(data.message ?? t("auth:verify.failed"));
  }
  return data;
}

export async function resendVerification(email: string): Promise<string> {
  const res = await apiFetch("/api/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  const data = await readMessage(res);
  return data.message ?? t("auth:notice.resendDefault");
}
