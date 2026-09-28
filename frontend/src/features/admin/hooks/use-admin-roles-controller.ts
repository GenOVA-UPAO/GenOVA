import { useState } from "react";

import type { RoleFormPayload } from "../api/admin-roles.api";
import { errorMessage } from "../lib/error-message";
import type { Role } from "../lib/types";
import {
  useCreateRole,
  useDeleteRole,
  useRegistrationMode,
  useRoles,
  useSetRegistrationMode,
  useUpdateRole,
} from "./use-admin-roles";

const CONNECT_ERROR = "No se pudo conectar con el servidor. Intenta de nuevo.";

export function useAdminRolesController() {
  const rolesQuery = useRoles();
  const modeQuery = useRegistrationMode();
  const setMode = useSetRegistrationMode();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  const formMutation = editingRole !== null ? updateRole : createRole;
  const modeRole = modeQuery.data?.default_registration_role ?? "usuarios_prueba";

  const closeForm = () => {
    setIsFormOpen(false);
    createRole.reset();
    updateRole.reset();
  };

  const submitForm = (payload: RoleFormPayload) => {
    if (editingRole !== null) {
      updateRole.mutate({ roleId: editingRole.id, payload }, { onSuccess: closeForm });
    } else {
      createRole.mutate(payload, { onSuccess: closeForm });
    }
  };

  const confirmDelete = (reassignRoleId?: string) => {
    if (deletingRole === null) return;
    deleteRole.mutate(
      { role: deletingRole, reassignToId: reassignRoleId },
      {
        onSuccess: () => {
          setDeletingRole(null);
        },
      },
    );
  };

  const cancelDelete = () => {
    deleteRole.reset();
    setDeletingRole(null);
  };

  return {
    roles: rolesQuery.data ?? [],
    isLoading: rolesQuery.isLoading,
    error: rolesQuery.error ? errorMessage(rolesQuery.error, CONNECT_ERROR) : "",
    tesis: modeRole === "usuarios_prueba",
    savingMode: setMode.isPending,
    toggleMode: () => {
      setMode.mutate(modeRole === "usuarios_prueba" ? "usuario" : "usuarios_prueba");
    },
    isFormOpen,
    editingRole,
    formError: formMutation.error ? errorMessage(formMutation.error, CONNECT_ERROR) : "",
    isSubmitting: formMutation.isPending,
    openCreate: () => {
      setEditingRole(null);
      setIsFormOpen(true);
    },
    openEdit: (role: Role) => {
      setEditingRole(role);
      setIsFormOpen(true);
    },
    closeForm,
    submitForm,
    deletingRole,
    requestDelete: setDeletingRole,
    deleteError: deleteRole.error ? errorMessage(deleteRole.error, CONNECT_ERROR) : "",
    isDeleting: deleteRole.isPending,
    confirmDelete,
    cancelDelete,
    retry: () => {
      void rolesQuery.refetch();
    },
  };
}
