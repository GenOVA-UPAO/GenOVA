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
    onSuccess: (result) => {
      queryClient.setQueryData(llmSettingsKeys.apiKeys, result);
      // Sin esperar: la recarga de los ajustes tarda segundos y dejaba «Guardar
      // clave» girando (y el aviso de «clave quitada») mucho después de hecho.
      void queryClient.invalidateQueries({ queryKey: llmSettingsKeys.all });
    },
  });

  return {
    apiKeys: query.data?.api_keys ?? {},
    loading: query.isLoading,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
    save: saveMutation.mutateAsync,
    saving: saveMutation.isPending,
  };
}
