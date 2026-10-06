import { useMutation } from "@tanstack/react-query";

import { cancelOvaRegeneration } from "../api/ova-workspace.api";

/** Cancelación de la regeneración en curso (el backend descarta lo ya editado). */
export function useRegenCancel(ovaId: string, jobId: string | undefined) {
  const mutation = useMutation({ mutationFn: async () => { if (jobId) await cancelOvaRegeneration(ovaId, jobId); } });
  const cancelling = mutation.isPending || mutation.isSuccess;
  return { canCancel: Boolean(jobId) && !cancelling, cancelling, reset: mutation.reset, run: () => { mutation.mutate(); } };
}
