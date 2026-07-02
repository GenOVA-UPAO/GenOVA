import { Injectable } from "@angular/core";

import { apiJson } from "@/core/lib/http";

import type { Resource } from "@/core/lib/ova-types";

import { PHASE_SELECT_CFG, type PhaseResourceMap } from "../lib/phase-select.config";

export { PHASE_SELECT_CFG as PHASE_SELECT_KEYS } from "../lib/phase-select.config";

@Injectable({ providedIn: "root" })
export class PhaseSelectService {
  async fetchAllPhaseResources(): Promise<PhaseResourceMap> {
    const results = await Promise.allSettled(
      PHASE_SELECT_CFG.map((p) =>
        apiJson<{ recursos?: Resource[] }>(`/api/agents/${p.key}/recursos`),
      ),
    );

    const next: PhaseResourceMap = {};

    PHASE_SELECT_CFG.forEach((p, i) => {
      const r = results[i];

      next[p.key] = r.status === "fulfilled" ? (r.value.recursos ?? []) : [];
    });

    return next;
  }

  async fetchPhaseResources(phaseKey: string): Promise<Resource[]> {
    try {
      const data = await apiJson<{ recursos?: Resource[] }>(`/api/agents/${phaseKey}/recursos`);

      return data.recursos ?? [];
    } catch {
      return [];
    }
  }

  async fetchVideoKeyConfigured(): Promise<boolean> {
    try {
      const data = await apiJson<{ video_api_key_configured?: boolean }>("/api/admin/nodes-config");

      return data.video_api_key_configured ?? true;
    } catch {
      return true;
    }
  }
}
