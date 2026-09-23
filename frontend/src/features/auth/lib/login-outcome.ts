import type { AuthMessageData } from "@/core/auth/auth.service";

import { LOGIN_FAILED, TOO_MANY_ATTEMPTS } from "./auth-copy";

export type LoginOutcome =
  | { kind: "totp"; ticket: string }
  | { kind: "unverified" }
  | { kind: "ok" }
  | { kind: "locked"; minutes: number }
  | { kind: "error"; message: string };

/**
 * El límite por IP (slowapi) responde 429 sin `message`: sin esto se veía el
 * genérico «No se pudo iniciar sesión» y nadie sabía que bastaba con esperar.
 */
function errorMessage(status: number, data: AuthMessageData): string {
  const fallback = status === 429 ? TOO_MANY_ATTEMPTS : LOGIN_FAILED;
  return data.message ?? fallback;
}

export function loginOutcome(status: number, data: AuthMessageData): LoginOutcome {
  if (data.totp_required && data.ticket) return { kind: "totp", ticket: data.ticket };
  if (data.email_verification_required || data.error === "email_not_verified") {
    return { kind: "unverified" };
  }
  if (status === 200) return { kind: "ok" };
  if (status === 403 && data.retry_after_minutes) {
    return { kind: "locked", minutes: data.retry_after_minutes };
  }
  return { kind: "error", message: errorMessage(status, data) };
}

export function loginErrorMessage(outcome: LoginOutcome): string {
  if (outcome.kind === "locked") {
    return `Cuenta bloqueada. Intenta de nuevo en ${String(outcome.minutes)} minuto(s).`;
  }
  return outcome.kind === "error" ? outcome.message : LOGIN_FAILED;
}

export function registerNeedsNotice(status: number, required?: boolean): boolean | null {
  if (status !== 200 && status !== 201) return null;
  return required === true;
}

export interface LoginApplyResult {
  totp?: string;
  unverified?: boolean;
  ok?: boolean;
  error?: string;
}

export function applyLoginOutcome(
  status: number,
  data: AuthMessageData,
): LoginApplyResult {
  const outcome = loginOutcome(status, data);
  if (outcome.kind === "totp") return { totp: outcome.ticket };
  if (outcome.kind === "unverified") return { unverified: true };
  if (outcome.kind === "ok") return { ok: true };
  return { error: loginErrorMessage(outcome) };
}
