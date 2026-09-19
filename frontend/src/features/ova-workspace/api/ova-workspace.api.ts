import { triggerDownloadFromResponse } from "@/core/lib/download";
import { apiFetch, apiJson, HttpError } from "@/core/lib/http";

import type { RegenProgressDto } from "../lib/regen-poll";
import type { OvaData, Phase } from "../lib/types";
import type { PhaseMicroVersion, VersionDiffData } from "../lib/version-history.types";

export interface RegenRequest { prompt?: string | null; phaseIds?: string[] }
export interface RegenAck { job_id: string }

export function fetchOvaWorkspace(ovaId: string): Promise<OvaData> { return apiJson(`/api/ovas/${ovaId}/editar`); }
export function saveOvaPhase(ovaId: string, phaseId: string, content: string): Promise<Phase> {
  return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}`, { method: "PATCH", body: JSON.stringify({ content }) });
}
export function triggerOvaRegeneration(ovaId: string, request: RegenRequest = {}): Promise<RegenAck> {
  return apiJson(`/api/ovas/${ovaId}/regenerar`, { method: "POST", body: JSON.stringify({ prompt: request.prompt ?? null, fase_ids: request.phaseIds ?? [] }) });
}
export function fetchRegenerationProgress(ovaId: string, jobId: string): Promise<RegenProgressDto> { return apiJson(`/api/ovas/${ovaId}/regenerar/${jobId}/progress`); }
export function fetchOvaVersions(ovaId: string): Promise<unknown> { return apiJson(`/api/ovas/${ovaId}/versiones`); }
export function fetchVersionDiff(ovaId: string, first: string | number, second: string | number): Promise<VersionDiffData> { return apiJson(`/api/ovas/${ovaId}/versiones/diff?v1=${String(first)}&v2=${String(second)}`); }
export function revertOvaVersion(ovaId: string, versionId: string): Promise<unknown> { return apiJson(`/api/ovas/${ovaId}/versiones/${versionId}/revert`, { method: "POST" }); }
export function addOvaPhase(ovaId: string, phaseType: string, prompt: string): Promise<Phase> { return apiJson(`/api/ovas/${ovaId}/fases`, { method: "POST", body: JSON.stringify({ phase_type: phaseType, prompt }) }); }
export function deleteOvaPhase(ovaId: string, phaseId: string): Promise<void> { return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}`, { method: "DELETE" }); }
export function reorderOvaPhases(ovaId: string, reorders: unknown): Promise<void> { return apiJson(`/api/ovas/${ovaId}/fases/reorder`, { method: "PATCH", body: JSON.stringify({ reorders }) }); }
export function fetchPhaseVersions(ovaId: string, phaseId: string): Promise<{ micro_versions?: PhaseMicroVersion[] }> { return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}/versiones`); }
export function revertPhaseVersion(ovaId: string, phaseId: string, versionId: string): Promise<unknown> { return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}/versiones/${versionId}/revert`, { method: "POST" }); }
export async function downloadOvaScorm(ovaId: string): Promise<Blob> {
  const response = await apiFetch(`/api/ovas/${ovaId}/export-scorm`);
  if (!response.ok) {
    throw new HttpError("Error al exportar SCORM", { status: response.status });
  }
  return response.blob();
}

export async function exportOvaScorm(ovaId: string): Promise<void> {
  const response = await apiFetch(`/api/ovas/${ovaId}/export-scorm`);
  if (!response.ok) throw new HttpError('Error al exportar SCORM', { status: response.status });
  await triggerDownloadFromResponse(response, `ova-${ovaId}.zip`);
}
