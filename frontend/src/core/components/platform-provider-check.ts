import i18n from "i18next";
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
    { fallbackMsg: i18n.t("shared:no_se_pudo_comprobar_la_conexion") },
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
        label: result.models === null ? i18n.t("shared:conectado") : i18n.t("shared:conectado_value", { p0: modelsLabel(result.models) }),
        hint: "",
      };
    case "invalid_key":
      return {
        tone: "error",
        label: i18n.t("shared:clave_no_valida"),
        hint: i18n.t("shared:el_proveedor_la_rechazo_puede_estar_mal_copia_ff00f0"),
      };
    case "no_key":
      return { tone: "neutral", label: i18n.t("shared:sin_clave"), hint: i18n.t("shared:anade_una_clave_para_conectarlo") };
    case "rate_limited":
      return {
        tone: "warning",
        label: i18n.t("shared:limite_de_peticiones"),
        hint: i18n.t("shared:el_proveedor_esta_limitando_la_cuenta_vuelve__447e42"),
      };
    case "unchecked":
      return {
        tone: "neutral",
        label: i18n.t("shared:guardada"),
        hint: i18n.t("shared:este_proveedor_no_permite_comprobar_la_clave__5107c0"),
      };
    case "unreachable":
      return {
        tone: "warning",
        label: i18n.t("shared:sin_respuesta"),
        hint: i18n.t("shared:el_proveedor_no_respondio_vuelve_a_probar_en__7ba188"),
      };
    default:
      return {
        tone: "warning",
        label: i18n.t("shared:no_se_pudo_comprobar"),
        hint: i18n.t("shared:vuelve_a_probar_en_unos_minutos"),
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
