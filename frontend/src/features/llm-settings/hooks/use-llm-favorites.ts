import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { saveEnabledModels } from "../api/llm-settings.api";
import type { EnabledModel } from "../lib/user-llm-settings.types";
import { errorMessage } from "./error-message";
import { llmSettingsKeys } from "./query-keys";

export function useLlmFavorites(serverEnabled: EnabledModel[]) {
  const queryClient = useQueryClient();
  const [override, setOverride] = useState<EnabledModel[] | null>(null);
  const enabledModels = override ?? serverEnabled;

  const mutation = useMutation({
    mutationFn: saveEnabledModels,
    onSuccess: async (data) => {
      if (Array.isArray(data.models)) setOverride(data.models);
      await queryClient.invalidateQueries({ queryKey: llmSettingsKeys.all });
    },
    onError: (err: unknown) => {
      toast.error(errorMessage(err, "No se pudo guardar el favorito."));
    },
  });

  async function toggleFavorite(provider: string, modelId: string): Promise<void> {
    const current = [...enabledModels];
    const next = nextEnabled(current, provider, modelId);
    setOverride(next);
    try {
      await mutation.mutateAsync(next);
    } catch {
      setOverride(current);
    }
  }

  return {
    enabledModels,
    toggleFavorite,
    isModelEnabled: (provider: string, modelId: string) =>
      enabledModels.some((item) => item.provider === provider && item.model_id === modelId),
  };
}

function nextEnabled(current: EnabledModel[], provider: string, modelId: string): EnabledModel[] {
  const exists = current.some((item) => item.provider === provider && item.model_id === modelId);
  if (exists) {
    return current.filter((item) => !(item.provider === provider && item.model_id === modelId));
  }
  return [...current, { provider, model_id: modelId }];
}
