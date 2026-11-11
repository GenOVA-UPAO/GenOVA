import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import i18n from "i18next";
import { toast } from "sonner";

import {
  deleteLtiPlatform,
  fetchLtiPlatforms,
  fetchLtiTool,
  type LtiPlatformPayload,
  saveLtiPlatform,
} from "../api/admin-lti.api";
import { adminKeys } from "./query-keys";

export function useLtiTool() {
  return useQuery({ queryKey: adminKeys.ltiTool, queryFn: fetchLtiTool });
}

export function useLtiPlatforms() {
  return useQuery({ queryKey: adminKeys.ltiPlatforms, queryFn: fetchLtiPlatforms });
}

export function useSaveLtiPlatform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | null; payload: LtiPlatformPayload }) =>
      saveLtiPlatform(id, payload),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.ltiPlatforms });
      toast.success(i18n.t(id ? "lti:toast.updated" : "lti:toast.created"));
    },
  });
}

export function useDeleteLtiPlatform() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLtiPlatform(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.ltiPlatforms });
      toast.success(i18n.t("lti:toast.deleted"));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
