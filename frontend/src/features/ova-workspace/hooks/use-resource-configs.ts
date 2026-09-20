import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchResourceConfigs, saveResourceConfigs } from "../api/resource-configs.api";

const key = ["ova-resource-configs"] as const;

export function useResourceConfigs() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: key, queryFn: fetchResourceConfigs });
  const save = useMutation({ mutationFn: saveResourceConfigs, onSuccess: (data) => queryClient.setQueryData(key, data) });
  return { ...query, save };
}
