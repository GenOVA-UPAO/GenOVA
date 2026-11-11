import { useQuery } from "@tanstack/react-query";

import { fetchPhaseBlocks } from "../api/ova-workspace.api";
import type { ResourceBlock } from "../lib/visual-editor.types";

export const phaseBlocksKey = (ovaId: string, phaseId: string) => ["ova-phase-blocks", ovaId, phaseId] as const;

export function usePhaseBlocks(ovaId: string, phaseId: string) {
  return useQuery<ResourceBlock[]>({
    queryKey: phaseBlocksKey(ovaId, phaseId),
    queryFn: () => fetchPhaseBlocks(ovaId, phaseId),
    enabled: Boolean(ovaId && phaseId),
  });
}
