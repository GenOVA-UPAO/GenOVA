import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  deleteResourceFeedback,
  type FeedbackInput,
  fetchResourceFeedback,
  putResourceFeedback,
  type ResourceFeedbackDto,
} from "../api/resource-feedback.api";
import type { FeedbackReason } from "../lib/resource-feedback";

const feedbackKey = (ovaId: string) => ["ova-resource-feedback", ovaId] as const;
const SAVE_ERROR = "No se pudo guardar tu valoración. Inténtalo de nuevo.";

/** Valoración del docente sobre el recurso `phaseId` (idempotente por recurso en el servidor). */
export function useResourceFeedback(ovaId: string, phaseId: string) {
  const queryClient = useQueryClient();
  const key = feedbackKey(ovaId);
  const query = useQuery({ queryKey: key, queryFn: () => fetchResourceFeedback(ovaId) });
  const current = query.data?.find((item) => item.phase_id === phaseId);
  const save = useMutation({
    mutationFn: (input: FeedbackInput) => putResourceFeedback(ovaId, phaseId, input),
    onSuccess: (saved) => {
      queryClient.setQueryData<ResourceFeedbackDto[]>(key, (list) => [
        ...(list ?? []).filter((item) => item.phase_id !== saved.phase_id),
        saved,
      ]);
    },
    onError: () => toast.error(SAVE_ERROR),
  });
  const remove = useMutation({
    mutationFn: () => deleteResourceFeedback(ovaId, phaseId),
    onSuccess: () => {
      queryClient.setQueryData<ResourceFeedbackDto[]>(key, (list) =>
        (list ?? []).filter((item) => item.phase_id !== phaseId),
      );
    },
    onError: () => toast.error("No se pudo quitar tu valoración."),
  });
  return {
    current,
    saving: save.isPending,
    busy: save.isPending || remove.isPending,
    /** «Me sirvió»: guarda; si ya estaba marcado, lo quita. */
    toggleUp: () => {
      if (current?.rating === "up") {
        remove.mutate();
        return;
      }
      save.mutate({ rating: "up" }, { onSuccess: () => toast.success("Gracias por tu valoración.") });
    },
    sendDown: (reason: FeedbackReason | null, comment: string, done: () => void) => {
      save.mutate(
        { rating: "down", reason, comment: comment || null },
        {
          onSuccess: () => {
            done();
            toast.success("Gracias, usaremos tu opinión para mejorar los recursos.");
          },
        },
      );
    },
  };
}
