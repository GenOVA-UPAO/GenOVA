import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { triggerOvaRegeneration } from "../api/ova-workspace.api";
import { assistantRunningMessage, type RegenChatMessage, type RegenPayload, userChatMessage } from "../lib/regen-chat";
import { useRegenerationProgress } from "./use-regeneration-progress";
import { useWorkspaceChat } from "./use-workspace-chat";

export function useChatRegeneration(ovaId: string) {
  const chat = useWorkspaceChat(ovaId);
  const [assistant, setAssistant] = useState<RegenChatMessage>();
  const [jobId, setJobId] = useState<string>();
  const patch = chat.patch.mutateAsync;
  const progress = useRegenerationProgress(ovaId, jobId, assistant, patch);
  const request = useMutation({ mutationFn: async ({ prompt, historyText, phaseIds, resourceLabels }: RegenPayload) => {
    await chat.append.mutateAsync(userChatMessage(historyText, { resourceLabels }));
    const running = assistantRunningMessage(undefined, resourceLabels);
    await chat.append.mutateAsync(running);
    try {
      const ack = await triggerOvaRegeneration(ovaId, { prompt, phaseIds });
      setAssistant(running);
      setJobId(ack.job_id);
    } catch (error) {
      await patch({ ...running, status: 'error', text: 'No se pudo iniciar la regeneración.' });
      throw error;
    }
  } });
  const active = chat.data?.find((message) => message.id === assistant?.id);
  const busy = request.isPending || (active?.status === 'running' && !progress.error);
  return { chat, request, busy, ...progress };
}
