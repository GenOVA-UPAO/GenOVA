import { apiJson } from "@/core/lib/http";
import { ovaJobsApi } from "@/core/services/ova-jobs-api.service";

import type { JobSnapshot } from "../lib/ova-job-view-model";

export interface StartJobRequest {
  prompt: string;
  uploadIds?: string[];
  resources: { phase_type: string; resource_type: string | number }[];
  theme?: { color: string; design: string };
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
      theme: request.theme,
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

export function cancelOvaJob(jobId: string): Promise<JobAck> {
  return ovaJobsApi.cancelJob(jobId);
}
