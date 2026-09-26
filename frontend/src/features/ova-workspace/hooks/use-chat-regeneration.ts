import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { triggerOvaRegeneration } from "../api/ova-workspace.api";
import { assistantRunningMessage, type RegenChatMessage, type RegenPayload, userChatMessage } from "../lib/regen-chat";
import { useRegenerationProgress } from "./use-regeneration-progress";
import { useWorkspaceChat } from "./use-workspace-chat";

/** El motivo ya quedó escrito en el hilo: el compositor no lo repite. */
class RegenStartError extends Error {}

function startFailureText(error: unknown): string {
  const reason = error instanceof Error ? error.message.trim() : "";
  return reason ? `No se pudo iniciar la regeneración. ${reason}` : "No se pudo iniciar la regeneración.";
}

/**
 * Una única instancia por workspace (la crea `OvaEditView`): el chat y el
 * panel del OVA comparten así el estado «regenerando» y ninguno lanza una
 * segunda regeneración mientras corre otra.
 */
export function useChatRegeneration(ovaId: string) {
  const chat = useWorkspaceChat(ovaId);
  const [assistant, setAssistant] = useState<RegenChatMessage>();
  const [jobId, setJobId] = useState<string>();
  const patch = chat.patch.mutateAsync;
  const progress = useRegenerationProgress(ovaId, jobId, assistant, patch);
  const request = useMutation({ mutationFn: async ({ prompt, historyText, phaseIds, resourceLabels, uploadIds }: RegenPayload) => {
    await chat.append.mutateAsync(userChatMessage(historyText, { resourceLabels }));
    const running = assistantRunningMessage(undefined, resourceLabels);
    await chat.append.mutateAsync(running);
    try {
      const ack = await triggerOvaRegeneration(ovaId, { prompt, phaseIds, uploadIds });
      setAssistant(running);
      setJobId(ack.job_id);
    } catch (error) {
      const text = startFailureText(error);
      await patch({ ...running, status: 'error', text });
      throw new RegenStartError(text);
    }
  } });
  const active = chat.data?.find((message) => message.id === assistant?.id);
  const busy = request.isPending || (active?.status === 'running' && !progress.error);
  // Solo los fallos que no llegaron al hilo (p. ej. no se pudo guardar el mensaje).
  const composerError = request.error instanceof RegenStartError ? undefined : request.error?.message;
  return { ovaId, chat, request, busy, composerError, runningLabels: active?.status === 'running' ? assistant?.resourceLabels : undefined, ...progress };
}

export type ChatRegeneration = ReturnType<typeof useChatRegeneration>;
