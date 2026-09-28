import { apiJson, HttpError } from "@/core/lib/http";
import { ovaJobsApi } from "@/core/services/ova-jobs-api.service";

import type { JobSnapshot } from "../lib/ova-job-view-model";
import { themePayload } from "../lib/ova-theme";
import type { OvaTheme } from "../lib/types";

export interface StartJobRequest {
  prompt: string;
  uploadIds?: string[];
  // La API valida el tipo como string; aceptarlo como number dejaba pasar un 422.
  resources: { phase_type: string; resource_type: string }[];
  theme?: OvaTheme;
  resourceConfigs?: Record<string, Record<string, number>>;
}

export interface JobAck {
  job_id: string;
  ova_id?: string | null;
  status: string;
}

export interface ResourceContent {
  id: string;
  phase_type: string;
  resource_type: string | number | null;
  content: string;
}

export function startOvaJob(request: StartJobRequest): Promise<JobAck> {
  return apiJson<JobAck>("/api/jobs", {
    method: "POST",
    body: JSON.stringify({
      prompt: request.prompt,
      upload_ids: request.uploadIds ?? [],
      resources: request.resources,
      theme: request.theme && themePayload(request.theme),
      resource_configs: request.resourceConfigs,
    }),
  });
}

export function fetchOvaJob(jobId: string): Promise<JobSnapshot> {
  return ovaJobsApi.getJobStatus(jobId) as Promise<JobSnapshot>;
}

export function fetchOvaJobByOvaId(ovaId: string): Promise<JobSnapshot> {
  return ovaJobsApi.getJobByOvaId(ovaId) as Promise<JobSnapshot>;
}

export function fetchJobResourceContent(jobId: string, resourceId: string): Promise<ResourceContent> {
  return ovaJobsApi.getResourceContent(jobId, resourceId) as Promise<ResourceContent>;
}

export function resumeOvaJob(jobId: string, resourceIds?: string[]): Promise<JobAck> {
  return ovaJobsApi.resumeJob(jobId, resourceIds) as Promise<JobAck>;
}

export async function cancelOvaJob(jobId: string): Promise<JobAck> {
  try {
    return await ovaJobsApi.cancelJob(jobId);
  } catch (error) {
    // 409 = el job ya terminó (done/error/canceled). No es un fallo de usuario:
    // el panel debe refrescar el estado real, no pintar un error rojo.
    if (error instanceof HttpError && error.status === 409) {
      return { job_id: jobId, status: "already_terminal" };
    }
    throw error;
  }
}
