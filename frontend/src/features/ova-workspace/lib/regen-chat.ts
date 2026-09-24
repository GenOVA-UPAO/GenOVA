import { resourceLabel } from "./resource-label";
import type { PhaseWithContent } from "./types";

export type RegenChatRole = "user" | "assistant" | "system";
export type RegenChatStatus = "running" | "success" | "error";
export type RegenChatKind =
  "message" | "prompt" | "selection" | "selection_all" | "regen_all" | "status";

export interface RegenChatMessage {
  id: string;
  role: RegenChatRole;
  kind: RegenChatKind;
  text: string;
  createdAt: number;
  status?: RegenChatStatus;
  percentage?: number;
  resourceLabels?: string[];
}

let seq = 0;

export function newChatId(prefix: string): string {
  seq += 1;
  return `${prefix}-${String(Date.now())}-${String(seq)}`;
}

/** UUID v4 for persistence keys (backend PK). */
export function newPersistedChatId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return newChatId("msg");
}

export function labelsForPhaseIds(
  phases: PhaseWithContent[],
  phaseIds: string[],
): string[] | undefined {
  if (!phaseIds.length) return undefined;
  const labels = phases.filter((p) => phaseIds.includes(p.id)).map((p) => resourceLabel(p));
  return labels.length ? labels : undefined;
}

export interface RegenPayload {
  /** Instrucción que recibe el backend. Vacía = regenerar desde cero. */
  prompt: string;
  /** Lo que se lee en el historial del chat. */
  historyText: string;
  phaseIds: string[];
  resourceLabels?: string[];
  /** Archivos adjuntados con el clip para este cambio. */
  uploadIds?: string[];
}

export interface ChatAttachments {
  ids: string[];
  names: string[];
}

/**
 * Los adjuntos se guardan en el texto del mensaje del docente, en una última
 * línea con este prefijo (el mensaje del chat no tiene un campo propio para
 * ellos); `splitAttachments` la separa para pintarla aparte.
 */
const ATTACHMENTS_PREFIX = "Archivos adjuntos: ";

/** Los adjuntos ya subidos de la lista del chat (los que aún suben no cuentan). */
export function chatAttachments(files: readonly { uploadId: string; filename: string }[]): ChatAttachments {
  const sent = files.filter((file) => file.uploadId);
  return { ids: sent.map((file) => file.uploadId), names: sent.map((file) => file.filename) };
}

export function withAttachments(text: string, names: readonly string[] = []): string {
  return names.length ? `${text}\n${ATTACHMENTS_PREFIX}${names.join(", ")}` : text;
}

export function splitAttachments(text: string): { text: string; attachments: string[] } {
  const at = text.lastIndexOf(`\n${ATTACHMENTS_PREFIX}`);
  if (at < 0) return { text, attachments: [] };
  const names = text.slice(at + 1 + ATTACHMENTS_PREFIX.length).split(", ").filter(Boolean);
  return { text: text.slice(0, at), attachments: names };
}

/**
 * Payload de un botón de regenerar. Su etiqueta es solo texto para el
 * historial: si viajara como `prompt`, el backend la trataría como un cambio
 * que aplicar al OVA —así acabó el OVA de la Ley de Ohm tratando sobre cómo
 * regenerar un OVA—, de modo que el `prompt` va vacío.
 */
export function buttonRegenPayload(
  phases: PhaseWithContent[],
  label: string,
  phaseIds: string[],
  attachments?: ChatAttachments,
): RegenPayload {
  return {
    prompt: "",
    historyText: withAttachments(label, attachments?.names),
    phaseIds,
    resourceLabels: labelsForPhaseIds(phases, phaseIds),
    uploadIds: attachments?.ids,
  };
}

/** Payload de un mensaje escrito en el chat: el texto es la instrucción. */
export function messageRegenPayload(
  phases: PhaseWithContent[],
  message: string,
  phaseIds: string[],
  attachments?: ChatAttachments,
): RegenPayload {
  return {
    prompt: message,
    historyText: withAttachments(message, attachments?.names),
    phaseIds,
    resourceLabels: labelsForPhaseIds(phases, phaseIds),
    uploadIds: attachments?.ids,
  };
}

export function userChatMessage(
  text: string,
  opts: { kind?: RegenChatKind; resourceLabels?: string[] } = {},
): RegenChatMessage {
  return {
    id: newPersistedChatId(),
    role: "user",
    kind: opts.kind ?? "prompt",
    text,
    createdAt: Date.now(),
    resourceLabels: opts.resourceLabels,
  };
}

export function systemChatMessage(
  text: string,
  opts: { kind?: RegenChatKind; resourceLabels?: string[] } = {},
): RegenChatMessage {
  return {
    id: newPersistedChatId(),
    role: "system",
    kind: opts.kind ?? "selection",
    text,
    createdAt: Date.now(),
    resourceLabels: opts.resourceLabels,
  };
}

export function assistantRunningMessage(
  text = "Iniciando regeneración…",
  resourceLabels?: string[],
): RegenChatMessage {
  return {
    id: newPersistedChatId(),
    role: "assistant",
    kind: "status",
    text,
    createdAt: Date.now(),
    status: "running",
    percentage: 0,
    resourceLabels,
  };
}

export function patchChatMessage(
  msgs: RegenChatMessage[],
  id: string,
  patch: Partial<RegenChatMessage>,
): RegenChatMessage[] {
  return msgs.map((m) => (m.id === id ? { ...m, ...patch } : m));
}

export function progressChatPatch(percentage: number, stage: string): Partial<RegenChatMessage> {
  return { percentage, text: stage || "Regenerando…", status: "running" };
}

export function formatChatTarget(resourceLabels?: string[]): string {
  if (!resourceLabels?.length) return "al OVA completo";
  if (resourceLabels.length === 1) return `a «${resourceLabels[0]}»`;
  return `a ${String(resourceLabels.length)} recursos (${resourceLabels.join(", ")})`;
}

/** Informe del backend sobre el material de referencia (RAG) de una regeneración. */
export interface RegenRagReport {
  status?: "used" | "no_matches" | "none" | "disabled" | "error";
  sources?: { filename: string; chunks: number; origin: "adjunto" | "ova" }[];
  attachments?: { filename: string; used: boolean; reason?: string | null }[];
}

function fragments(count: number): string {
  return `${String(count)} fragmento${count === 1 ? "" : "s"}`;
}

function sourcesLine(report: RegenRagReport): string | undefined {
  const sources = report.sources ?? [];
  if (sources.length) {
    const list = sources
      .map((s) => `${s.filename} (${fragments(s.chunks)}${s.origin === "ova" ? ", del OVA" : ""})`)
      .join(", ");
    return `Material consultado: ${list}.`;
  }
  if (report.status === "error") {
    return "No se pudo consultar el material de referencia: el cambio se aplicó sin él.";
  }
  if (report.status === "no_matches" && !report.attachments?.length) {
    return "Los archivos del OVA no tenían nada relevante para este cambio.";
  }
  return undefined;
}

/**
 * Qué archivos se consultaron de verdad y por qué alguno adjunto no. Nunca da
 * a entender que un archivo se usó si el backend no lo metió en el prompt.
 */
export function ragReportText(report?: RegenRagReport | null): string {
  if (!report) return "";
  const unused = (report.attachments ?? [])
    .filter((att) => !att.used)
    .map((att) => `No se usó «${att.filename}»: ${att.reason ?? "sin fragmentos relevantes."}`);
  return [sourcesLine(report), ...unused].filter(Boolean).join("\n");
}

export function finishChatPatch(
  status: "success" | "error",
  resourceLabels?: string[],
  rag?: RegenRagReport | null,
): Partial<RegenChatMessage> {
  const target = formatChatTarget(resourceLabels);
  if (status === "success") {
    const material = ragReportText(rag);
    return {
      status: "success",
      percentage: 100,
      text: [`Listo. Los cambios ya están aplicados ${target}.`, material].filter(Boolean).join("\n"),
      resourceLabels,
    };
  }
  return {
    status: "error",
    text: `La regeneración falló ${target}. Puedes intentarlo de nuevo.`,
    resourceLabels,
  };
}

export function selectionToggleMessage(label: string, selected: boolean): RegenChatMessage {
  return systemChatMessage(
    selected ? `Recurso seleccionado: ${label}` : `Recurso deseleccionado: ${label}`,
    { kind: "selection", resourceLabels: selected ? [label] : undefined },
  );
}

export function selectionAllMessage(labels: string[], allSelected: boolean): RegenChatMessage {
  if (allSelected) {
    return systemChatMessage(
      `Seleccionados todos los recursos (${String(labels.length)}): ${labels.join(", ")}`,
      {
        kind: "selection_all",
        resourceLabels: labels,
      },
    );
  }
  return systemChatMessage("Se vació la selección de recursos.", { kind: "selection_all" });
}

export function fromApiMessage(raw: {
  id: string;
  role: string;
  kind?: string;
  text: string;
  status?: string | null;
  percentage?: number | null;
  resource_labels?: string[];
  created_at?: string | null;
}): RegenChatMessage {
  return {
    id: raw.id,
    role: raw.role ? (raw.role as RegenChatRole) : "system",
    kind: raw.kind ? (raw.kind as RegenChatKind) : "message",
    text: raw.text,
    createdAt: raw.created_at ? Date.parse(raw.created_at) : Date.now(),
    status: raw.status ? (raw.status as RegenChatStatus) : undefined,
    percentage: raw.percentage ?? undefined,
    resourceLabels: raw.resource_labels?.length ? raw.resource_labels : undefined,
  };
}
