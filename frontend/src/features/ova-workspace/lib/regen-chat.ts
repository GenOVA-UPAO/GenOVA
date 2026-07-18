import { resourceLabel } from "./resource-label";
import type { PhaseWithContent } from "./types";

export type RegenChatRole = "user" | "assistant";
export type RegenChatStatus = "running" | "success" | "error";

export interface RegenChatMessage {
  id: string;
  role: RegenChatRole;
  text: string;
  createdAt: number;
  status?: RegenChatStatus;
  percentage?: number;
  /** Nombres de recursos a los que aplica el prompt (si hubo selección). */
  resourceLabels?: string[];
}

let seq = 0;

export function newChatId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now()}-${seq}`;
}

export function labelsForPhaseIds(
  phases: PhaseWithContent[],
  phaseIds: string[],
): string[] | undefined {
  if (!phaseIds.length) return undefined;
  const labels = phases.filter((p) => phaseIds.includes(p.id)).map((p) => resourceLabel(p));
  return labels.length ? labels : undefined;
}

export function userChatMessage(text: string, resourceLabels?: string[]): RegenChatMessage {
  return {
    id: newChatId("user"),
    role: "user",
    text,
    createdAt: Date.now(),
    resourceLabels,
  };
}

export function assistantRunningMessage(
  text = "Iniciando regeneración…",
  resourceLabels?: string[],
): RegenChatMessage {
  return {
    id: newChatId("asst"),
    role: "assistant",
    text,
    createdAt: Date.now(),
    status: "running",
    percentage: 0,
    resourceLabels,
  };
}

/** Mutaciones inmutables del historial de regeneración. */
export function patchChatMessage(
  msgs: RegenChatMessage[],
  id: string,
  patch: Partial<RegenChatMessage>,
): RegenChatMessage[] {
  return msgs.map((m) => (m.id === id ? { ...m, ...patch } : m));
}

export function progressChatPatch(
  percentage: number,
  stage: string,
): Partial<RegenChatMessage> {
  return { percentage, text: stage || "Regenerando…", status: "running" };
}

/** Texto del alcance: un recurso, varios, o todo el OVA. */
export function formatChatTarget(resourceLabels?: string[]): string {
  if (!resourceLabels?.length) return "al OVA completo";
  if (resourceLabels.length === 1) return `a «${resourceLabels[0]}»`;
  return `a ${resourceLabels.length} recursos (${resourceLabels.join(", ")})`;
}

export function finishChatPatch(
  status: "success" | "error",
  resourceLabels?: string[],
): Partial<RegenChatMessage> {
  const target = formatChatTarget(resourceLabels);
  if (status === "success") {
    return {
      status: "success",
      percentage: 100,
      text: `Listo. Los cambios ya están aplicados ${target}.`,
      resourceLabels,
    };
  }
  return {
    status: "error",
    text: `La regeneración falló ${target}. Puedes intentarlo de nuevo.`,
    resourceLabels,
  };
}
