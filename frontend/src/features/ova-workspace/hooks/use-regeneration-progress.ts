import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { fetchRegenerationProgress } from "../api/ova-workspace.api";
import { type RegenChatMessage } from "../lib/regen-chat";
import { handleRegenPollTick } from "../lib/regen-poll";
import { ovaWorkspaceKey } from "./use-ova-workspace";

export function useRegenerationProgress(
  ovaId: string | undefined,
  jobId: string | undefined,
  assistant: RegenChatMessage | undefined,
  patchMessage: (message: RegenChatMessage) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  // Estado ligado al job que lo produjo: un fallo anterior no debe marcar como
  // fallida (ni dejar de bloquear) la siguiente regeneración.
  const [progressState, setProgressState] = useState({ jobId: "", percentage: 0, stage: "" });
  const [failure, setFailure] = useState<{ jobId: string; message: string }>();
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); };
  }, []);

  useEffect(() => {
    if (!ovaId || !jobId || !assistant) return undefined;
    const schedule = (id: string) => { timer.current = setTimeout(() => { void tick(id); }, 3_000); };
    const tick = async (id: string) => handleRegenPollTick(id, {
      mounted: () => mounted.current,
      setProgress: (value) => { setProgressState({ jobId: id, ...value }); },
      getAssistantId: () => assistant.id,
      getAssistantLabels: () => assistant.resourceLabels,
      patchChat: async (_id, patch) => {
        await patchMessage({ ...assistant, ...patch });
      },
      onTerminal: () => { if (timer.current) clearTimeout(timer.current); },
      onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ovaWorkspaceKey(ovaId) }); void queryClient.invalidateQueries({ queryKey: ["ova"] }); },
      onError: (message) => { setFailure({ jobId: id, message }); },
      schedule,
      fetchProgress: (id) => fetchRegenerationProgress(ovaId, id),
    });
    void tick(jobId);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [assistant, jobId, ovaId, patchMessage, queryClient]);

  const current = Boolean(jobId) && progressState.jobId === jobId;
  const progress = { percentage: current ? progressState.percentage : 0, stage: current ? progressState.stage : "" };
  const error = jobId && failure?.jobId === jobId ? failure.message : undefined;
  return { error, progress };
}
