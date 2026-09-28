import { useNavigate } from "react-router";

import { authStore } from "@/core/auth/auth-store";
import { queryClient } from "@/core/lib/query-client";

import { errorMessage } from "../lib/error-message";
import type { ChangePasswordValues, ProfileData, ProfileFormValues } from "../lib/types";
import { useChangePassword, useDeleteAccount, useSaveProfile } from "./use-profile";

export function useProfileActions() {
  const navigate = useNavigate();
  const saveProfile = useSaveProfile();
  const changePassword = useChangePassword();
  const deleteAccount = useDeleteAccount();

  /** Devuelve el perfil tal como quedó guardado, o `null` si falló. */
  const handleSaveProfile = async (values: ProfileFormValues): Promise<ProfileData | null> => {
    try {
      return await saveProfile.mutateAsync(values);
    } catch {
      return null;
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
          // El login lo confirma con un aviso: las pantallas de acceso no tienen toasts
          // y antes se aterrizaba ahí sin saber si la cuenta se había borrado.
          void navigate("/login?deleted=1", { replace: true });
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
