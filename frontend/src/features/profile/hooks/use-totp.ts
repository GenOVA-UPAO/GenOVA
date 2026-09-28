import { useMutation, useQueryClient } from "@tanstack/react-query";

import { confirmTotpSetup, disableTotp, startTotpSetup } from "../api/totp.api";
import { profileKeys } from "./use-profile";

export function useStartTotpSetup() {
  return useMutation({
    mutationFn: () => startTotpSetup(),
  });
}

export function useConfirmTotpSetup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => confirmTotpSetup(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

export function useDisableTotp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => disableTotp(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}
