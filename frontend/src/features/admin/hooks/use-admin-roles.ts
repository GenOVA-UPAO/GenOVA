import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  deleteRole,
  fetchRegistrationMode,
  fetchRoles,
  type RoleFormPayload,
  setRegistrationMode,
  submitRole,
} from "../api/admin-roles.api";
import type { Role } from "../lib/types";
import { adminKeys } from "./query-keys";

export function useRoles() {
  return useQuery({
    queryKey: adminKeys.roles,
    queryFn: fetchRoles,
  });
}

export function useRegistrationMode() {
  return useQuery({
    queryKey: adminKeys.registrationMode,
    queryFn: fetchRegistrationMode,
  });
}

export function useSetRegistrationMode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (defaultRegistrationRole: string) => setRegistrationMode(defaultRegistrationRole),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.registrationMode });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RoleFormPayload) => submitRole(null, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.roles });
      toast.success("Rol creado con éxito");
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, payload }: { roleId: string; payload: RoleFormPayload }) =>
      submitRole(roleId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.roles });
      toast.success("Rol actualizado con éxito");
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ role, reassignToId }: { role: Role; reassignToId?: string }) =>
      deleteRole(role.id, reassignToId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.roles });
      toast.success("Rol eliminado con éxito");
    },
  });
}
