import { useMutation, useQueryClient } from "@tanstack/react-query";
import { t } from "i18next";
import { toast } from "sonner";

import {
  sendUserResetEmail,
  unlockUser,
  updateUser,
  updateUserRole,
  updateUserStatus,
} from "../api/admin-users.api";
import type { UserEditPayload } from "../lib/types";
import { adminKeys } from "./query-keys";

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: adminKeys.usersAll });
  };
}

function useUsersMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  getSuccessMessage: () => string,
) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      invalidate();
      toast.success(getSuccessMessage());
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateUserRole() {
  return useUsersMutation<{ userId: string; roleId: string }>(
    ({ userId, roleId }) => updateUserRole(userId, roleId),
    () => t("admin:users.toast.roleUpdated"),
  );
}

export function useUpdateUser() {
  return useUsersMutation<{ userId: string; fields: UserEditPayload }>(
    ({ userId, fields }) => updateUser(userId, fields),
    () => t("admin:users.toast.profileUpdated"),
  );
}

export function useToggleUserStatus() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      updateUserStatus(userId, isActive),
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(
        variables.isActive
          ? t("admin:users.toast.userActivated")
          : t("admin:users.toast.userDeactivated"),
      );
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUnlockUser() {
  return useUsersMutation<string>(
    (userId) => unlockUser(userId),
    () => t("admin:users.toast.userUnlocked"),
  );
}

export function useSendResetEmail() {
  return useUsersMutation<string>(
    (userId) => sendUserResetEmail(userId),
    () => t("admin:users.toast.resetEmailSent"),
  );
}
