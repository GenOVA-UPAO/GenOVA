import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { authStore } from "@/core/auth/auth-store";

import { changePassword, deleteAccount, fetchProfile, saveProfile } from "../api/profile.api";
import { errorMessage } from "../lib/error-message";
import type { ChangePasswordValues, ProfileFormValues } from "../lib/types";

export const profileKeys = {
  all: ["profile"] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.all,
    queryFn: fetchProfile,
  });
}

export function useSaveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ProfileFormValues) => saveProfile(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileKeys.all });
      await authStore.revalidate();
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Error al actualizar."));
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (values: ChangePasswordValues) => changePassword(values),
    onSuccess: () => {
      toast.success("Contraseña actualizada con éxito.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Error al actualizar."));
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (password: string) => deleteAccount(password),
  });
}
