import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { getAdminGuardrails, saveAdminGuardrails } from "@/core/services/platform-settings.api";

import {
  type GuardrailsConfig,
  type GuardrailsDraft,
  parseGuardrailsConfig,
  parseModerationModel,
  toGuardrailsPayload,
} from "../lib/guardrails";
import { errorMessage } from "./error-message";
import { adminLlmKeys } from "./query-keys";

export function useGuardrails() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: adminLlmKeys.guardrails,
    queryFn: getAdminGuardrails,
  });
  const config = parseGuardrailsConfig(query.data);
  const [localDraft, setLocalDraft] = useState<GuardrailsDraft | null>(null);
  const draft = localDraft ?? (config ? toDraft(config) : null);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, string>) => saveAdminGuardrails(payload),
    onSuccess: async () => {
      setLocalDraft(null);
      await queryClient.invalidateQueries({ queryKey: adminLlmKeys.guardrails });
      toast.success("Guardrails guardados.");
    },
    onError: (err: unknown) => {
      toast.error(errorMessage(err, "No se pudo guardar la configuración de guardrails."));
    },
  });

  return {
    loading: query.isLoading,
    error: query.error ? errorMessage(query.error, "No se pudo cargar la configuración de guardrails.") : "",
    config,
    draft,
    saving: saveMutation.isPending,
    setDraft: setLocalDraft,
    save: async () => {
      if (!draft) return;
      await saveMutation.mutateAsync(toGuardrailsPayload(draft));
    },
  };
}

function toDraft(cfg: GuardrailsConfig): GuardrailsDraft {
  return {
    topicEnabled: cfg.topicEnabled,
    topicArea: cfg.topicArea,
    moderationEnabled: cfg.moderationEnabled,
    termsText: cfg.terms.join("\n"),
    model: parseModerationModel(cfg.moderationModel) ?? { provider: "", modelId: "" },
  };
}
