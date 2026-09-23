import { useMutation, type useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { saveLlmSettings } from "../api/llm-settings.api";
import {
  addFallbackIn,
  removeFallbackIn,
  resetTipoIn,
  setFallbackIn,
  setModelIn,
  setTimeoutIn,
  type SettingsMap,
} from "../lib/llm-settings-mutations";
import type { LlmSettingsResponse } from "../lib/user-llm-settings.types";
import { errorMessage } from "./error-message";
import { llmSettingsKeys } from "./query-keys";

const DEFAULT_TIMEOUT = 120;

export function useLlmSettingsDraft(
  server: LlmSettingsResponse,
  queryClient: ReturnType<typeof useQueryClient>,
) {
  const [draft, setDraft] = useState<SettingsMap | null>(null);
  const [dirty, setDirty] = useState(false);
  const settings = dirty ? draft : (server.settings ?? null);
  // «Usar el de la plataforma» vuelve al modelo del admin, no a la semilla.
  const defaults = server.platform?.defaults ?? server.defaults ?? {};

  function update(next: SettingsMap): void {
    setDraft(next);
    setDirty(true);
  }

  const saveMutation = useMutation({
    mutationFn: saveLlmSettings,
    onSuccess: async (data) => {
      setDraft(data.settings ?? {});
      setDirty(false);
      await queryClient.invalidateQueries({ queryKey: llmSettingsKeys.all });
      toast.success("Configuración de IA guardada.");
    },
    onError: (err: unknown) => {
      toast.error(errorMessage(err, "No se pudo guardar la configuración."));
    },
  });

  return {
    settings,
    dirty,
    saving: saveMutation.isPending,
    bounds: Array.isArray(server.timeout_bounds) ? server.timeout_bounds : [30, 300],
    setModel: (tipo: string, provider: string, modelId: string) => {
      update(setModelIn(settings, tipo, provider, modelId));
    },
    setTipoTimeout: (tipo: string, timeoutS: number) => {
      update(setTimeoutIn(settings, tipo, timeoutS));
    },
    resetTipo: (tipo: string) => {
      update(resetTipoIn(settings, tipo, defaults, DEFAULT_TIMEOUT));
    },
    setFallback: (tipo: string, index: number, provider: string, modelId: string) => {
      update(setFallbackIn(settings, tipo, index, { provider, model_id: modelId }));
    },
    addFallback: (tipo: string) => {
      update(addFallbackIn(settings, tipo));
    },
    removeFallback: (tipo: string, index: number) => {
      update(removeFallbackIn(settings, tipo, index));
    },
    save: async () => saveDraft(settings, saveMutation.mutateAsync),
    discard: () => {
      setDraft(server.settings ?? null);
      setDirty(false);
    },
  };
}

async function saveDraft(
  settings: SettingsMap | null,
  mutateAsync: (current: SettingsMap) => Promise<unknown>,
): Promise<boolean> {
  if (!settings) return false;
  try {
    await mutateAsync(settings);
    return true;
  } catch {
    return false;
  }
}
