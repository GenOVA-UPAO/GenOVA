import { useQuery } from "@tanstack/react-query";

import { fetchPhaseBlocks } from "../api/ova-workspace.api";
import type { ResourceBlock } from "../lib/visual-editor.types";

export function usePhaseBlocks(ovaId: string, phaseId: string) {
  return useQuery<ResourceBlock[]>({
    queryKey: ["ova-phase-blocks", ovaId, phaseId],
    queryFn: () => fetchPhaseBlocks(ovaId, phaseId),
    enabled: Boolean(ovaId && phaseId),
  });
}
