import { useMutation } from "@tanstack/react-query";

import { apiJson } from "@/core/lib/http";

/** Resultado de «Probar conexión» de un proveedor. La clave nunca viene. */
export interface ProviderCheckResult {
  provider: string;
  /** `connected` | `no_key` | `invalid_key` | `rate_limited` | `unreachable` | `unchecked` | `error`. */
  code: string;
  /** Modelos que da el proveedor con esa clave (solo si `connected`). */
  models: number | null;
  key_source?: string;
}

export type CheckTone = "success" | "error" | "warning" | "neutral";

/** Estado de «Probar conexión» de una fila (lo que devuelve `useProviderCheck`). */
export interface ProviderCheckState {
  checking: boolean;
  result: ProviderCheckResult | null;
  error: Error | null;
}

/** Si hay algo que decir de una comprobación (en curso o hecha). */
export function hasCheck(check: ProviderCheckState): boolean {
  return check.checking || check.result !== null;
}

export const CHECK_TONE_TEXT: Record<CheckTone, string> = {
  success: "text-success-strong",
  error: "text-destructive",
  warning: "text-foreground",
  neutral: "text-muted-foreground",
};

export const CHECK_TONE_DOT: Record<CheckTone, string> = {
  success: "bg-success",
  error: "bg-destructive",
  warning: "bg-accent-brand",
  neutral: "bg-muted-foreground",
};

/** «Probar conexión» con la clave de la plataforma (solo administradores). */
export function checkPlatformProvider(provider: string): Promise<ProviderCheckResult> {
  return apiJson(
    `/api/admin/platform-config/${encodeURIComponent(provider)}/check`,
    { method: "POST" },
    { fallbackMsg: "No se pudo comprobar la conexión." },
  );
}

function modelsLabel(count: number): string {
  return count === 1 ? "1 modelo" : `${count.toLocaleString("es")} modelos`;
}

/** Qué decir del resultado: «Conectado · 312 modelos», «Clave no válida», «Sin respuesta». */
export function providerCheckText(result: ProviderCheckResult): {
  tone: CheckTone;
  label: string;
  /** Qué hacer (vacío si está bien). */
  hint: string;
} {
  switch (result.code) {
    case "connected":
      return {
        tone: "success",
        label: result.models === null ? "Conectado" : `Conectado · ${modelsLabel(result.models)}`,
        hint: "",
      };
    case "invalid_key":
      return {
        tone: "error",
        label: "Clave no válida",
        hint: "El proveedor la rechazó. Puede estar mal copiada, caducada o revocada.",
      };
    case "no_key":
      return { tone: "neutral", label: "Sin clave", hint: "Añade una clave para conectarlo." };
    case "rate_limited":
      return {
        tone: "warning",
        label: "Límite de peticiones",
        hint: "El proveedor está limitando la cuenta. Vuelve a probar en un minuto.",
      };
    case "unchecked":
      return {
        tone: "neutral",
        label: "Guardada",
        hint: "Este proveedor no permite comprobar la clave sin generar. Se comprobará al usarla.",
      };
    case "unreachable":
      return {
        tone: "warning",
        label: "Sin respuesta",
        hint: "El proveedor no respondió. Vuelve a probar en unos minutos.",
      };
    default:
      return {
        tone: "warning",
        label: "No se pudo comprobar",
        hint: "Vuelve a probar en unos minutos.",
      };
  }
}

/** Estado de «Probar conexión» de una fila: se lanza a mano o justo tras guardar la clave. */
export function useProviderCheck(check: (provider: string) => Promise<ProviderCheckResult>) {
  const mutation = useMutation({ mutationFn: check });
  return {
    run: (provider: string) => {
      mutation.mutate(provider);
    },
    reset: mutation.reset,
    checking: mutation.isPending,
    result: mutation.data ?? null,
    error: mutation.error,
  };
}
