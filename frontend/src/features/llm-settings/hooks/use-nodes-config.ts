import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { getAdminNodesConfig, saveAdminNodesConfig } from "@/core/services/platform-settings.api";

import { errorMessage } from "./error-message";
import { asNodesConfig, type NodesConfigResponse } from "./nodes-config.types";
import { adminLlmKeys } from "./query-keys";

export function useNodesConfig() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: adminLlmKeys.nodes,
    queryFn: getAdminNodesConfig,
  });
  const data = asNodesConfig(query.data);
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const readyDraft = draft ?? copyConfig(data);

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, string>) => saveAdminNodesConfig(payload),
    onSuccess: async () => {
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: adminLlmKeys.nodes });
    },
  });

  return {
    data,
    loading: query.isLoading,
    error: query.error
      ? errorMessage(query.error, "No se pudo cargar la configuración de nodos.")
      : "",
    draft: readyDraft,
    rounds: Number(readyDraft?.ova_reflection_rounds ?? 1),
    saving: saveMutation.isPending,
    setRounds: (value: number) => {
      if (!readyDraft) return;
      setDraft({ ...readyDraft, ova_reflection_rounds: String(value) });
    },
    toggleFlag: (flag: string) => {
      if (!readyDraft) return;
      setDraft({ ...readyDraft, [flag]: readyDraft[flag] === "1" ? "0" : "1" });
    },
    save: (payload: Record<string, string>, successMsg: string) =>
      persistNodes(saveMutation.mutateAsync, payload, successMsg),
  };
}

function copyConfig(data: NodesConfigResponse): Record<string, string> | null {
  return data.config ? { ...data.config } : null;
}

async function persistNodes(
  mutateAsync: (payload: Record<string, string>) => Promise<unknown>,
  payload: Record<string, string>,
  successMsg: string,
): Promise<void> {
  try {
    await mutateAsync(payload);
    toast.success(successMsg);
  } catch (err) {
    toast.error(errorMessage(err, "No se pudo guardar."));
    throw err;
  }
}
