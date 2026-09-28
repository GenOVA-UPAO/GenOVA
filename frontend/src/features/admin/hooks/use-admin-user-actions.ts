import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  successMessage: string,
) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      invalidate();
      toast.success(successMessage);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateUserRole() {
  return useUsersMutation<{ userId: string; roleId: string }>(
    ({ userId, roleId }) => updateUserRole(userId, roleId),
    "Rol del usuario actualizado.",
  );
}

export function useUpdateUser() {
  return useUsersMutation<{ userId: string; fields: UserEditPayload }>(
    ({ userId, fields }) => updateUser(userId, fields),
    "Perfil actualizado.",
  );
}

export function useToggleUserStatus() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      updateUserStatus(userId, isActive),
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(variables.isActive ? "Usuario activado." : "Usuario desactivado.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUnlockUser() {
  return useUsersMutation<string>((userId) => unlockUser(userId), "Usuario desbloqueado.");
}

export function useSendResetEmail() {
  return useUsersMutation<string>(
    (userId) => sendUserResetEmail(userId),
    "Correo de restablecimiento en camino.",
  );
}
