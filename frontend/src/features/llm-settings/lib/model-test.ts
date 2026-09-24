import type { ModelTestResult } from "../api/model-tools.api";

/** Qué pasó y qué hacer, para cada código de «Probar». */
export interface TestOutcome {
  tone: "success" | "error" | "warning";
  title: string;
  /** Qué hacer para arreglarlo (vacío si respondió). */
  hint: string;
}

const MODEL_OUTCOMES: Record<string, TestOutcome> = {
  no_key: {
    tone: "error",
    title: "Falta la clave del proveedor",
    hint: "Añádela en Credenciales y vuelve a probar.",
  },
  invalid_key: {
    tone: "error",
    title: "Clave no válida",
    hint: "El proveedor la rechazó. Cámbiala en Credenciales: puede estar mal copiada, caducada o revocada.",
  },
  no_credit: {
    tone: "error",
    title: "Sin crédito",
    hint: "La cuenta del proveedor no tiene saldo para este modelo. Recárgala o elige otro modelo.",
  },
  rate_limited: {
    tone: "warning",
    title: "Límite de peticiones",
    hint: "El proveedor está limitando la cuenta. Espera un minuto y vuelve a probar, o elige otro modelo.",
  },
  model_not_found: {
    tone: "error",
    title: "El modelo no existe",
    hint: "El proveedor no lo reconoce o lo retiró. Elige otro modelo del catálogo.",
  },
  timeout: {
    tone: "warning",
    title: "No respondió a tiempo",
    hint: "Tardó más de 25 s. Puede estar saturado: prueba de nuevo o ponle un respaldo más rápido.",
  },
  unreachable: {
    tone: "warning",
    title: "Sin respuesta del proveedor",
    hint: "El proveedor está caído o no se pudo conectar. Vuelve a probar en unos minutos.",
  },
  empty: {
    tone: "warning",
    title: "Respondió vacío",
    hint: "El modelo gastó la respuesta en razonar y no devolvió texto. Úsalo solo con un respaldo.",
  },
};

const UNKNOWN_OUTCOME: TestOutcome = {
  tone: "error",
  title: "El proveedor devolvió un error",
  hint: "Vuelve a probar. Si se repite, elige otro modelo.",
};

export function modelTestOutcome(result: ModelTestResult): TestOutcome {
  if (result.ok) return { tone: "success", title: "Responde", hint: "" };
  return MODEL_OUTCOMES[result.code] ?? UNKNOWN_OUTCOME;
}

/** «812 ms» o «2,4 s». */
export function formatLatency(ms: number | null): string | null {
  if (ms === null) return null;
  if (ms < 1000) return `${String(Math.round(ms))} ms`;
  return `${(ms / 1000).toLocaleString("es", { maximumFractionDigits: 1 })} s`;
}

export function keySourceText(source: ModelTestResult["key_source"]): string | null {
  switch (source) {
    case "platform":
      return "Con la clave de la plataforma.";
    case "server":
      return "Con la clave del servidor.";
    case "own":
      return "Con tu clave.";
    default:
      return null;
  }
}
