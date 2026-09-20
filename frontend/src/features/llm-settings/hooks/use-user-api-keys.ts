import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getUserApiKeys, saveUserApiKey } from "../api/llm-settings.api";
import { llmSettingsKeys } from "./query-keys";

export function useUserApiKeys() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: llmSettingsKeys.apiKeys,
    queryFn: getUserApiKeys,
  });

  const saveMutation = useMutation({
    mutationFn: ({ provider, key }: { provider: string; key: string }) =>
      saveUserApiKey(provider, key),
    onSuccess: async (result) => {
      queryClient.setQueryData(llmSettingsKeys.apiKeys, result);
      await queryClient.invalidateQueries({ queryKey: llmSettingsKeys.all });
    },
  });

  return {
    apiKeys: query.data?.api_keys ?? {},
    loading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    saving: saveMutation.isPending,
  };
}
