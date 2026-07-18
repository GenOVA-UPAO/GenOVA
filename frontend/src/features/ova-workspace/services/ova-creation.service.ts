import { Injectable } from "@angular/core";

import { apiJson } from "@/core/lib/http";

export interface StartJobArgs {
  prompt: string;
  uploadIds?: string[];
  resources: { phase_type: string; resource_type: string }[];
  theme?: unknown;
  resourceConfigs?: Record<string, unknown>;
}

export interface JobAck {
  job_id: string;
  ova_id?: string | null;
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

/** Solo configs de recursos seleccionados — el estado del form arrastra configs
 * de generaciones anteriores (audit 2026-07-06). */
function pickSelectedConfigs(
  configs: Record<string, unknown> | undefined,
  resources: { phase_type: string; resource_type: string }[],
): Record<string, unknown> {
  if (!configs) return {};
  const selected = new Set(resources.map((r) => `${r.phase_type}:${r.resource_type}`));
  return Object.fromEntries(Object.entries(configs).filter(([key]) => selected.has(key)));
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
        resource_configs: pickSelectedConfigs(args.resourceConfigs, args.resources),
      }),
    });
  }
}
