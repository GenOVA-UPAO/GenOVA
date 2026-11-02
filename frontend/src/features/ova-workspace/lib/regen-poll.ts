import i18n from "i18next";

import { HttpError } from "@/core/lib/http";

import { cancelledChatPatch } from "./regen-cancel";
import type { RegenChatMessage, RegenRagReport } from "./regen-chat";
import { finishChatPatch, progressChatPatch } from "./regen-chat";

export interface RegenProgressDto {
  percentage?: number;
  stage?: string;
  status?: string;
  /** Material de referencia consultado (null hasta que el backend lo recupera). */
  rag?: RegenRagReport | null;
}

interface PollDeps {
  mounted: () => boolean;
  setProgress: (p: { percentage: number; stage: string }) => void;
  getAssistantId: () => string | null;
  getAssistantLabels: () => string[] | undefined;
  patchChat: (id: string, patch: Partial<RegenChatMessage>) => Promise<void>;
  onTerminal: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onCancelled?: () => void;
  /** Reprograma el siguiente tick; `failures` = fallos seguidos al consultar. */
  schedule: (jobId: string, failures?: number) => void;
  fetchProgress: (jobId: string) => Promise<RegenProgressDto>;
}

/** Tras tantos fallos seguidos al consultar el progreso, se deja de sondear. */
export const MAX_POLL_FAILURES = 5;
const BASE_POLL_MS = 3_000;
const MAX_POLL_MS = 30_000;

/** Espera antes del siguiente tick: 3 s, y con backoff (6, 12, 24, 30 s) tras fallos. */
export function regenPollDelayMs(failures = 0): number {
  return Math.min(BASE_POLL_MS * 2 ** failures, MAX_POLL_MS);
}

/**
 * Persistir el hilo nunca debe cortar el seguimiento: si el mensaje ya no
 * existe (p. ej. tras «Limpiar historial» el PATCH da 404) se ignora.
 */
async function safePatch(
  d: PollDeps,
  assistantId: string | null,
  patch: Partial<RegenChatMessage>,
): Promise<void> {
  if (!assistantId) return;
  try {
    await d.patchChat(assistantId, patch);
  } catch {
    // El progreso sigue aunque el hilo no se pueda actualizar.
  }
}

/** 403/404 del endpoint de progreso: el job no existe o no es del usuario. */
function isPermanent(error: unknown): boolean {
  return error instanceof HttpError && (error.status === 403 || error.status === 404);
}

async function handleTerminalProgress(
  progress: RegenProgressDto,
  d: PollDeps,
  assistantId: string | null,
): Promise<void> {
  if (progress.status === "cancelled") {
    // Cancelada por el docente: no es un fallo, solo se avisa en el hilo.
    await safePatch(d, assistantId, cancelledChatPatch());
    d.onTerminal();
    d.onCancelled?.();
    return;
  }
  await safePatch(
    d,
    assistantId,
    finishChatPatch(progress.status as "success" | "error", d.getAssistantLabels(), progress.rag),
  );
  d.onTerminal();
  if (progress.status === "success") d.onSuccess();
  else d.onError(i18n.t("workspace:la_regeneracion_fallo"));
}

function isFinished(status: string | undefined): boolean {
  return status === "success" || status === "error" || status === "cancelled";
}

async function applyProgress(jobId: string, progress: RegenProgressDto, d: PollDeps): Promise<void> {
  const percentage = progress.percentage ?? 0;
  const stage = progress.stage ?? "";
  d.setProgress({ percentage, stage });
  const asstId = d.getAssistantId();
  await safePatch(d, asstId, progressChatPatch(percentage, stage));
  if (isFinished(progress.status)) {
    await handleTerminalProgress(progress, d, asstId);
    return;
  }
  d.schedule(jobId);
}

async function giveUp(d: PollDeps): Promise<void> {
  const message = i18n.t("workspace:error_al_consultar_el_progreso_de_regeneracion");
  await safePatch(d, d.getAssistantId(), { status: "error", text: message });
  d.onTerminal();
  d.onError(message);
}

/**
 * Un tick de polling de regeneración; actualiza chat y reprograma si sigue.
 * Un fallo puntual (timeout, 502 con el servidor ocupado) no da por perdida
 * la regeneración: se reintenta con backoff y solo se abandona tras
 * `MAX_POLL_FAILURES` fallos seguidos o si el job ya no existe.
 */
export async function handleRegenPollTick(jobId: string, d: PollDeps, failures = 0): Promise<void> {
  if (!d.mounted()) return;
  let progress: RegenProgressDto;
  try {
    progress = await d.fetchProgress(jobId);
  } catch (error) {
    if (!d.mounted()) return;
    if (isPermanent(error) || failures + 1 >= MAX_POLL_FAILURES) await giveUp(d);
    else d.schedule(jobId, failures + 1);
    return;
  }
  if (d.mounted()) await applyProgress(jobId, progress, d);
}
