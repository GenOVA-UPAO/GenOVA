import { exportOva } from "@/core/export/api/ova-export.api";
import { apiFetch, apiJson, HttpError } from "@/core/lib/http";

import type { RegenProgressDto } from "../lib/regen-poll";
import type { OvaData, Phase, PhaseWithContent } from "../lib/types";
import type { PhaseMicroVersion, VersionDiffData } from "../lib/version-history.types";
import type { ConfirmResponse, EditResponse, ResourceBlock } from "../lib/visual-editor.types";

export interface RegenRequest { prompt?: string | null; phaseIds?: string[]; uploadIds?: string[] }
export interface RegenAck { job_id: string }

export function fetchOvaWorkspace(ovaId: string): Promise<OvaData> { return apiJson(`/api/ovas/${ovaId}/editar`); }
export function saveOvaPhase(ovaId: string, phaseId: string, content: string): Promise<Phase> {
  return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}`, { method: "PATCH", body: JSON.stringify({ content }) });
}
export function triggerOvaRegeneration(ovaId: string, request: RegenRequest = {}): Promise<RegenAck> {
  return apiJson(`/api/ovas/${ovaId}/regenerar`, { method: "POST", body: JSON.stringify({ prompt: request.prompt ?? null, fase_ids: request.phaseIds ?? [], ...(request.uploadIds?.length ? { upload_ids: request.uploadIds } : {}) }) });
}
export function fetchRegenerationProgress(ovaId: string, jobId: string): Promise<RegenProgressDto> { return apiJson(`/api/ovas/${ovaId}/regenerar/${jobId}/progress`); }
export function fetchOvaVersions(ovaId: string): Promise<unknown> { return apiJson(`/api/ovas/${ovaId}/versiones`); }
export function fetchVersionDiff(ovaId: string, first: string | number, second: string | number): Promise<VersionDiffData> { return apiJson(`/api/ovas/${ovaId}/versiones/diff?v1=${String(first)}&v2=${String(second)}`); }
export function revertOvaVersion(ovaId: string, versionId: string): Promise<unknown> { return apiJson(`/api/ovas/${ovaId}/versiones/${versionId}/revert`, { method: "POST" }); }
/** El backend responde `{ message, phase }`: se devuelve la fase creada. */
export async function addOvaPhase(ovaId: string, phaseType: string, prompt: string): Promise<PhaseWithContent> {
  const body = await apiJson<{ phase: PhaseWithContent }>(`/api/ovas/${ovaId}/fases`, { method: "POST", body: JSON.stringify({ phase_type: phaseType, prompt }) });
  return body.phase;
}
export function deleteOvaPhase(ovaId: string, phaseId: string): Promise<void> { return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}`, { method: "DELETE" }); }
export function reorderOvaPhases(ovaId: string, reorders: unknown): Promise<void> { return apiJson(`/api/ovas/${ovaId}/fases/reorder`, { method: "PATCH", body: JSON.stringify({ reorders }) }); }
export function fetchPhaseVersions(ovaId: string, phaseId: string): Promise<{ micro_versions?: PhaseMicroVersion[] }> { return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}/versiones`); }
export function revertPhaseVersion(ovaId: string, phaseId: string, versionId: string): Promise<unknown> { return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}/versiones/${versionId}/revert`, { method: "POST" }); }
export async function downloadOvaScorm(ovaId: string): Promise<Blob> {
  const response = await apiFetch(`/api/ovas/${ovaId}/export-scorm`);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string; detail?: string } | null;
    throw new HttpError(body?.message ?? body?.detail ?? "Error al exportar SCORM", { status: response.status, body });
  }
  return response.blob();
}

/** Compatibilidad: exporta en SCORM 1.2 con el endpoint genérico. */
export function exportOvaScorm(ovaId: string): Promise<void> {
  return exportOva(ovaId, "scorm12");
}

export interface EditorFeedbackPayload {
  fase_id?: string | null;
  instruccion?: string | null;
  bloques_antes?: unknown[];
  intencion_propuesta?: unknown;
  intencion_final?: unknown;
  resultado: "applied" | "undone" | "cancelled" | "rejected_guard";
  confianza?: number | null;
  backend?: string | null;
  motivo_rechazo?: string | null;
}

export function fetchPhaseBlocks(ovaId: string, phaseId: string): Promise<ResourceBlock[]> {
  return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}/bloques`);
}

export interface EditPhaseBlocksArgs {
  ovaId: string;
  phaseId: string;
  blocks: ResourceBlock[];
  instruction: string;
  backend?: string;
}

export function editPhaseBlocks({
  ovaId,
  phaseId,
  blocks,
  instruction,
  backend,
}: EditPhaseBlocksArgs): Promise<EditResponse> {
  return apiJson(`/api/ovas/${ovaId}/phases/${phaseId}/editor/interpret-and-apply`, {
    method: "POST",
    body: JSON.stringify({ instruction, blocks, backend }),
  });
}

export function confirmPhaseBlocks(
  ovaId: string,
  phaseId: string,
  blocks: ResourceBlock[],
  instruction?: string
): Promise<ConfirmResponse> {
  return apiJson(`/api/ovas/${ovaId}/phases/${phaseId}/editor/confirm`, {
    method: "POST",
    body: JSON.stringify({ instruction: instruction ?? "Edición en editor visual", blocks }),
  });
}

export function recordEditorFeedback(
  ovaId: string,
  payload: EditorFeedbackPayload
): Promise<{ success: boolean; feedback_id: string }> {
  return apiJson(`/api/ovas/${ovaId}/editor/feedback`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

