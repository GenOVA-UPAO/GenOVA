import { Injectable } from "@angular/core";
import { apiFetch, apiJson } from "@/core/lib/http";

export interface StartJobArgs {
  prompt: string;
  uploadIds?: string[];
  resources: Array<{ phase_type: string; resource_type: string }>;
  theme?: unknown;
  resourceConfigs?: Record<string, unknown>;
}

export interface JobAck {
  job_id: string;
  status: string;
}

const _ALL_PHASES = ["engage", "explore", "explain", "elaborate", "evaluate"];

export function toResourcesPayload(selections: Record<string, { id: string | number }[]>) {
  const out: { phase_type: string; resource_type: string }[] = [];
  for (const phase of _ALL_PHASES) {
    for (const r of selections[phase] || []) {
      out.push({ phase_type: phase, resource_type: String(r.id) });
    }
  }
  return out;
}

@Injectable({
  providedIn: "root",
})
export class OvaCreationService {
  startJob(args: StartJobArgs): Promise<JobAck> {
    return apiJson<JobAck>("/api/ova/jobs", {
      method: "POST",
      body: JSON.stringify({
        prompt: args.prompt,
        upload_ids: args.uploadIds || [],
        resources: args.resources,
        theme: args.theme,
        resource_configs: args.resourceConfigs || {},
      }),
    });
  }

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

  async downloadOvaScorm(ovaId: string): Promise<void> {
    const res = await apiFetch(`/api/ova/${ovaId}/scorm`);
    if (!res.ok) throw new Error("No se pudo exportar el paquete SCORM.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ova-scorm.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
