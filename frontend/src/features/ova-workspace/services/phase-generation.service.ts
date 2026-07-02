import { Injectable } from "@angular/core";
import { apiFetch } from "@/core/lib/http";
import type { PreviewResult, Resource } from "@/core/lib/ova-types";

@Injectable({ providedIn: "root" })
export class PhaseGenerationService {
  async fetchResources(phase: string): Promise<Resource[]> {
    const res = await apiFetch(`/api/ova-workspace/resources/${phase.toLowerCase()}`);
    const data = await res.json();
    return data.recursos || [];
  }

  async generateResource(
    phase: string,
    resource_id: string | number | undefined,
    concept: string,
  ): Promise<PreviewResult> {
    const res = await apiFetch(`/api/ova-workspace/generate/${phase.toLowerCase()}`, {
      method: "POST",
      body: JSON.stringify({
        resource_id: resource_id != null ? String(resource_id) : undefined,
        concept,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || data.detail || "Error al generar recurso");
    }
    return data as PreviewResult;
  }
}
