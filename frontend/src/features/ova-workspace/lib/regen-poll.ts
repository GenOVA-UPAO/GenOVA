import type { RegenChatMessage } from "./regen-chat";
import { finishChatPatch, progressChatPatch } from "./regen-chat";

export interface RegenProgressDto {
  percentage?: number;
  stage?: string;
  status?: string;
}

interface PollDeps {
  mounted: () => boolean;
  setProgress: (p: { percentage: number; stage: string }) => void;
  getAssistantId: () => string | null;
  getAssistantLabels: () => string[] | undefined;
  patchChat: (id: string, patch: Partial<RegenChatMessage>) => Promise<void>;
  onTerminal: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
  schedule: (jobId: string) => void;
  fetchProgress: (jobId: string) => Promise<RegenProgressDto>;
}

/** Un tick de polling de regeneración; actualiza chat y reprograma si sigue. */
export async function handleRegenPollTick(jobId: string, d: PollDeps): Promise<void> {
  if (!d.mounted()) return;
  try {
    const progress = await d.fetchProgress(jobId);
    if (!d.mounted()) return;
    const percentage = progress.percentage ?? 0;
    const stage = progress.stage ?? "";
    d.setProgress({ percentage, stage });
    const asstId = d.getAssistantId();
    const labels = d.getAssistantLabels();
    if (asstId) await d.patchChat(asstId, progressChatPatch(percentage, stage));

    if (progress.status === "success" || progress.status === "error") {
      if (asstId) await d.patchChat(asstId, finishChatPatch(progress.status, labels));
      d.onTerminal();
      if (progress.status === "success") d.onSuccess();
      else d.onError("La regeneración falló.");
      return;
    }
    d.schedule(jobId);
  } catch {
    if (!d.mounted()) return;
    const asstId = d.getAssistantId();
    if (asstId) {
      await d.patchChat(asstId, {
        status: "error",
        text: "Error al consultar el progreso de regeneración.",
      });
    }
    d.onTerminal();
    d.onError("Error al consultar el progreso de regeneración.");
  }
}
