import { useState } from "react";

import type { AdminUser, UserEditPayload, UsersHandlers } from "../lib/types";
import {
  useSendResetEmail,
  useToggleUserStatus,
  useUnlockUser,
  useUpdateUser,
  useUpdateUserRole,
} from "./use-admin-user-actions";

export function useAdminUsersController(onOpenEdit: (user: AdminUser) => void) {
  const [updatingUserId, setUpdatingUserId] = useState("");
  const roleMutation = useUpdateUserRole();
  const editMutation = useUpdateUser();
  const statusMutation = useToggleUserStatus();
  const unlockMutation = useUnlockUser();
  const resetMutation = useSendResetEmail();

  const clearUpdating = () => {
    setUpdatingUserId("");
  };

  const handlers: UsersHandlers = {
    handleRoleChange: (userId, roleId) => {
      setUpdatingUserId(userId);
      roleMutation.mutate({ userId, roleId }, { onSettled: clearUpdating });
    },
    handleToggleStatus: (userId, isActive) => {
      setUpdatingUserId(userId);
      statusMutation.mutate({ userId, isActive }, { onSettled: clearUpdating });
    },
    handleUnlockUser: (userId) => {
      setUpdatingUserId(userId);
      unlockMutation.mutate(userId, { onSettled: clearUpdating });
    },
    handleSendResetEmail: (userId) => {
      setUpdatingUserId(userId);
      resetMutation.mutate(userId, { onSettled: clearUpdating });
    },
    openEdit: onOpenEdit,
  };

  const saveEditedUser = (userId: string, fields: UserEditPayload, onSuccess: () => void) => {
    setUpdatingUserId(userId);
    editMutation.mutate(
      { userId, fields },
      {
        onSuccess,
        onSettled: clearUpdating,
      },
    );
  };

  const deactivateUser = (userId: string, onSuccess: () => void) => {
    setUpdatingUserId(userId);
    statusMutation.mutate(
      { userId, isActive: false },
      { onSuccess, onSettled: clearUpdating },
    );
  };

  return {
    updatingUserId,
    isSavingEdit: editMutation.isPending,
    isDeactivating: statusMutation.isPending,
    deactivateUser,
    handlers,
    saveEditedUser,
  };
}
