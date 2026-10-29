import { t } from "i18next";

import { modelDisplayName } from "./model-name";

/**
 * Estado real de la generación de imágenes y de video, como lo calcula el
 * backend (`llm/images/media_status.py`): interruptor de la tarea, modelo y
 * clave de plataforma.
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

export const MEDIA_STATE_LABELS: Record<MediaState, string> = new Proxy(
  {} as Record<MediaState, string>,
  {
    get: (_, prop: string) => t(`llm-settings:mediaStatus.states.${prop}`),
  },
);

/** Tono del estado: verde si funciona como se espera, aviso si a medias. */
export function mediaStateTone(state: MediaState | undefined): "success" | "warning" | "muted" {
  if (state === "active") return "success";
  return state === "english_only" ? "warning" : "muted";
}

function audioSentence(status: MediaTaskStatus | undefined): string {
  const openRouterHint = t("llm-settings:mediaStatus.openRouterKeyHint");
  if (!status) return openRouterHint;
  const name = modelDisplayName(status.label, status.model_id ?? "");
  switch (status.state) {
    case "active":
      return t("llm-settings:mediaStatus.audioActive", { name });
    case "english_only":
      return t("llm-settings:mediaStatus.audioEnglishOnly", { name, hint: openRouterHint });
    default:
      return t("llm-settings:mediaStatus.audioOff", { hint: openRouterHint });
  }
}

function fallbacksText(count: number | undefined): string {
  if (!count) return "";
  return ` ${t("llm-settings:mediaStatus.fallbacks", { count })}`;
}

function whenOff(task: MediaTask): string {
  return task === "video"
    ? t("llm-settings:mediaStatus.videoOffPrefix")
    : t("llm-settings:mediaStatus.imagenOffPrefix");
}

/** Una frase que dice qué pasa hoy y, si no se genera, dónde se arregla. */
export function mediaStatusSentence(task: MediaTask, status: MediaTaskStatus | undefined): string {
  if (task === "audio") return audioSentence(status);
  const taskName = t(`llm-settings:mediaStatus.tasks.${task}`);
  const where = t("llm-settings:mediaStatus.configSentence", { task: taskName });
  if (!status) return where;
  const name = modelDisplayName(status.label, status.model_id ?? "");
  switch (status.state) {
    case "active":
      return `${t("llm-settings:mediaStatus.generatedWith", { name, fallbacks: fallbacksText(status.fallbacks) })} ${where}`;
    case "no_model":
      return `${t("llm-settings:mediaStatus.noModel")} ${where}`;
    case "no_key":
      return t("llm-settings:mediaStatus.noKey", { model: name });
    case "unsupported":
      return `${t("llm-settings:mediaStatus.unsupportedVideoPrefix", { model: name })} ${where}`;
    default:
      return `${whenOff(task)} ${where}`;
  }
}
