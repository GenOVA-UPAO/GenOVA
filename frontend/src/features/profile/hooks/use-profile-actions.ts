import { useNavigate } from "react-router";

import { authStore } from "@/core/auth/auth-store";
import { queryClient } from "@/core/lib/query-client";

import { errorMessage } from "../lib/error-message";
import type { ChangePasswordValues, ProfileFormValues } from "../lib/types";
import { useChangePassword, useDeleteAccount, useSaveProfile } from "./use-profile";

export function useProfileActions() {
  const navigate = useNavigate();
  const saveProfile = useSaveProfile();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();

  const handleSaveProfile = async (values: ProfileFormValues): Promise<boolean> => {
    try {
      await saveProfile.mutateAsync(values);
      return true;
    } catch {
      return false;
    }
  };

  const handleChangePassword = async (values: ChangePasswordValues): Promise<boolean> => {
    try {
      await changePassword.mutateAsync(values);
      return true;
    } catch {
      return false;
    }
  };

  const handleDeleteAccount = (password: string) => {
    deleteAccount.mutate(password, {
      onSuccess: () => {
        void authStore.logout().then(() => {
          queryClient.clear();
          void navigate("/login", { replace: true });
        });
      },
    });
  };

  return {
    handleSaveProfile,
    handleChangePassword,
    handleDeleteAccount,
    isSavingProfile: saveProfile.isPending,
    isChangingPassword: changePassword.isPending,
    isDeletingAccount: deleteAccount.isPending,
    deleteError: deleteAccount.error
      ? errorMessage(deleteAccount.error, "Error al eliminar la cuenta.")
      : "",
    resetDeleteError: deleteAccount.reset,
  };
}
