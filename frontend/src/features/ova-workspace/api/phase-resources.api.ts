import { apiJson } from "@/core/lib/http";

import type { PreviewResult, Resource } from "../lib/ova-types";
import { PHASE_SELECT_CFG, type PhaseResourceMap } from "../lib/phase-select.config";

export function fetchPhaseResources(phase: string): Promise<{ recursos?: Resource[] }> {
  return apiJson(`/api/agents/${phase.toLowerCase()}/recursos`);
}

export async function fetchAllPhaseResources(): Promise<PhaseResourceMap> {
  const results = await Promise.allSettled(PHASE_SELECT_CFG.map((phase) => fetchPhaseResources(phase.key)));
  return Object.fromEntries(
    PHASE_SELECT_CFG.map((phase, index) => [phase.key, results[index]?.status === "fulfilled" ? (results[index].value.recursos ?? []) : []]),
  );
}

export function fetchVideoKeyConfigured(): Promise<{ video_api_key_configured?: boolean }> {
  return apiJson("/api/admin/nodes-config");
}

export function generatePhaseResource(
  phase: string,
  resourceId: string | number | undefined,
  concept: string,
): Promise<PreviewResult> {
  return apiJson<PreviewResult>(
    `/api/agents/${phase.toLowerCase()}/generate`,
    {
      method: "POST",
      body: JSON.stringify({ resource_type: resourceId === undefined ? undefined : Number(resourceId), concept }),
    },
    { timeoutMs: 120_000 },
  );
}
