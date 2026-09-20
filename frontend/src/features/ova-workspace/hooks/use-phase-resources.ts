import { useMutation, useQuery } from "@tanstack/react-query";

import { fetchAllPhaseResources, fetchPhaseResources, fetchVideoKeyConfigured, generatePhaseResource } from "../api/phase-resources.api";

export const phaseResourcesKey = (phase: string) => ["ova-phase-resources", phase] as const;

export function usePhaseResources(phase: string) {
  return useQuery({ queryKey: phaseResourcesKey(phase), queryFn: () => fetchPhaseResources(phase), select: (data) => data.recursos ?? [] });
}

export function useAllPhaseResources() {
  return useQuery({ queryKey: ["ova-phase-resources"], queryFn: fetchAllPhaseResources });
}

export function useVideoKeyConfigured() {
  return useQuery({ queryKey: ["ova-video-key"], queryFn: fetchVideoKeyConfigured, select: (data) => data.video_api_key_configured ?? true });
}

export function useGeneratePhaseResource() {
  return useMutation({ mutationFn: ({ phase, resourceId, concept }: { phase: string; resourceId: string | number | undefined; concept: string }) => generatePhaseResource(phase, resourceId, concept) });
}
