import { modelDisplayName } from "./model-name";

/**
 * Estado real de la generación de imágenes y de video, como lo calcula el
 * backend (`llm/images/media_status.py`): interruptor de la tarea, modelo y
 * clave de plataforma. Antes la pestaña Plataforma decía «Siempre activo» aunque
 * en Modelos la tarea estuviera desactivada.
 *
 * La narración del micro-podcast (`audio`) no tiene tarea ni interruptor: la
 * decide la clave que haya (OpenRouter → español; solo Groq → inglés; ninguna →
 * solo texto).
 *
 * Lógica pura: se prueba en media-status.spec.ts.
 */

export type MediaTask = "imagen" | "video" | "audio";
export type MediaState = "active" | "off" | "no_model" | "no_key" | "unsupported" | "english_only";

export interface MediaTaskStatus {
  state: MediaState;
  enabled?: boolean;
  provider?: string | null;
  model_id?: string | null;
  label?: string | null;
  fallbacks?: number;
  has_key?: boolean;
}

export const MEDIA_STATE_LABELS: Record<MediaState, string> = {
  active: "Activo",
  off: "Desactivado",
  no_model: "Sin modelo",
  no_key: "Sin clave",
  unsupported: "Sin video",
  english_only: "Solo en inglés",
};

/** Tono del estado: verde si funciona como se espera, aviso si a medias. */
export function mediaStateTone(state: MediaState | undefined): "success" | "warning" | "muted" {
  if (state === "active") return "success";
  return state === "english_only" ? "warning" : "muted";
}

const TASK_NAME: Record<Exclude<MediaTask, "audio">, string> = { imagen: "Imagen", video: "Video" };
const OPENROUTER_KEY_HINT = "Añade una clave de OpenRouter en Credenciales para narrar en español.";

function audioSentence(status: MediaTaskStatus | undefined): string {
  if (!status) return OPENROUTER_KEY_HINT;
  const name = modelDisplayName(status.label, status.model_id ?? "");
  switch (status.state) {
    case "active":
      return `Ahora: voz en español con ${name} (OpenRouter).`;
    case "english_only":
      return `Ahora: solo en inglés con ${name}. ${OPENROUTER_KEY_HINT}`;
    default:
      return `Desactivado: el micro-podcast queda solo en texto. ${OPENROUTER_KEY_HINT}`;
  }
}

function fallbacksText(count: number | undefined): string {
  if (!count) return "";
  return count === 1 ? " y 1 respaldo" : ` y ${String(count)} respaldos`;
}

function whenOff(task: MediaTask): string {
  return task === "video"
    ? "Ahora: desactivado, los recursos de video incluyen el guion para grabarlo."
    : "Ahora: desactivado, los recursos no llevan imágenes generadas.";
}

/** Una frase que dice qué pasa hoy y, si no se genera, dónde se arregla. */
export function mediaStatusSentence(task: MediaTask, status: MediaTaskStatus | undefined): string {
  if (task === "audio") return audioSentence(status);
  const where = `Se configura en la pestaña Modelos, tarea ${TASK_NAME[task]}.`;
  if (!status) return where;
  const name = modelDisplayName(status.label, status.model_id ?? "");
  switch (status.state) {
    case "active":
      return `Ahora: se genera con ${name}${fallbacksText(status.fallbacks)}. ${where}`;
    case "no_model":
      return `Ahora: activado, pero la tarea no tiene modelo. ${where}`;
    case "no_key":
      return `Ahora: la plataforma no tiene clave de API para ${name}; solo se genera para quien use su propia clave. Añádela en Credenciales.`;
    case "unsupported":
      return `Ahora: ${name} no es de OpenRouter, el único proveedor con video; los recursos incluyen el guion. ${where}`;
    default:
      return `${whenOff(task)} ${where}`;
  }
}
