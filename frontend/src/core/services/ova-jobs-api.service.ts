import { Injectable } from "@angular/core";

import { apiJson } from "../lib/http";

/**
 * Cliente HTTP de jobs de generación de OVA. Vive en core porque lo consumen
 * ova-workspace (creación/edición) y ova-library (polling de progreso).
 */
@Injectable({ providedIn: "root" })
export class OvaJobsApiService {
  getJobStatus(jobId: string): Promise<unknown> {
    return apiJson(`/api/ova/jobs/${jobId}`);
  }

  getJobByOvaId(ovaId: string): Promise<unknown> {
    return apiJson(`/api/ova/jobs?ova_id=${ovaId}`);
  }

  getResourceContent(jobId: string, resourceId: string): Promise<unknown> {
    return apiJson(`/api/ova/jobs/${jobId}/resources/${resourceId}/content`);
  }

  resumeJob(jobId: string, resourceIds?: string[]): Promise<unknown> {
    const body = resourceIds && resourceIds.length > 0 ? { resource_ids: resourceIds } : {};
    return apiJson(`/api/ova/jobs/${jobId}/resume`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  cancelJob(jobId: string): Promise<{ job_id: string; status: string }> {
    return apiJson<{ job_id: string; status: string }>(`/api/ova/jobs/${jobId}/cancel`, {
      method: "POST",
    });
  }
}
