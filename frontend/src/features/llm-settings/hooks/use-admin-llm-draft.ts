import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getAdminLlmConfig, saveAdminLlmConfig } from "@/core/services/platform-settings.api";

import type { Draft } from "../lib/llm-config-draft";
import { toPayload } from "../lib/llm-config-draft";
import type { LlmSettingsStore } from "./llm-settings-store.types";
import { adminLlmKeys } from "./query-keys";
import { buildAdminView } from "./use-admin-llm-view";

export function useAdminLlmDraft(store: LlmSettingsStore, isAdmin: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: adminLlmKeys.config,
    queryFn: getAdminLlmConfig,
    enabled: isAdmin,
  });
  const [localDraft, setLocalDraft] = useState<Draft | null | undefined>(undefined);
  const loading = store.loading || (isAdmin && query.isLoading);
  const view = buildAdminView({
    isAdmin,
    loading,
    isError: query.isError,
    raw: query.data,
    catalogFull: store.catalogFull,
    defaults: store.defaults,
    platform: store.platform,
  });
  const draft = localDraft === undefined ? view.draft : localDraft;

  const saveMutation = useMutation({
    mutationFn: (payload: unknown) => saveAdminLlmConfig(payload),
    onSuccess: async () => {
      setLocalDraft(undefined);
      await queryClient.invalidateQueries({ queryKey: adminLlmKeys.config });
    },
  });

  const adminDirty =
    !loading && JSON.stringify(draft) !== JSON.stringify(view.draft);

  return {
    loading,
    /** La config de plataforma no cargó: sin esto se mostraba la vista de usuario con ids en crudo. */
    error: isAdmin && query.isError,
    retry: () => {
      void query.refetch();
    },
    tasks: view.tasks,
    models: view.models,
    draft,
    adminDirty,
    saving: saveMutation.isPending,
    setDraft: (next: Draft) => {
      setLocalDraft(next);
    },
    discard: () => {
      setLocalDraft(undefined);
    },
    save: async () => saveAdminDraft(draft, view.tasks, saveMutation.mutateAsync),
  };
}

async function saveAdminDraft(
  draft: Draft | null,
  tasks: string[],
  mutateAsync: (payload: unknown) => Promise<unknown>,
): Promise<void> {
  await mutateAsync(toPayload(draft, tasks));
}
