import { Injectable } from "@angular/core";
import { apiJson } from "@/core/lib/http";

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
}
