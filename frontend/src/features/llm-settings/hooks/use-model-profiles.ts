import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyModelProfile,
  createModelProfile,
  deleteModelProfile,
  getModelProfiles,
  renameModelProfile,
} from "../api/model-tools.api";
import { modelToolsKeys } from "./model-tools-keys";

/** Perfiles de modelos de la plataforma (solo admin). */
export function useModelProfiles(enabled: boolean) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: modelToolsKeys.profiles, queryFn: getModelProfiles, enabled });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: modelToolsKeys.profiles });

  const create = useMutation({ mutationFn: createModelProfile, onSuccess: invalidate });
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameModelProfile(id, name),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteModelProfile, onSuccess: invalidate });
  const apply = useMutation({ mutationFn: applyModelProfile });

  return {
    profiles: query.data?.profiles ?? [],
    limit: query.data?.limit ?? 20,
    loading: query.isLoading,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
    create,
    rename,
    remove,
    apply,
  };
}
