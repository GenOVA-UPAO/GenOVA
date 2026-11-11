import { t } from "i18next";
import { useState } from "react";

import type { RoleFormPayload } from "../api/admin-roles.api";
import { errorMessage } from "../lib/error-message";
import type { Role } from "../lib/types";
import { TESIS_ROLE } from "../pages/admin-roles-page.helpers";
import {
  useCreateRole,
  useDeleteRole,
  useRegistrationMode,
  useRoles,
  useSetRegistrationMode,
  useUpdateRole,
} from "./use-admin-roles";

const connectError = () => t("admin:roles.connectError");

/**
 * Estado del modo tesis. Sin respuesta del servidor (cargando o con error) no se
 * supone ningún modo: el interruptor queda deshabilitado y sin marcar, para no
 * mostrar «Activado» ni escribir un valor deducido de un supuesto.
 */
function useRegistrationModeState() {
  const modeQuery = useRegistrationMode();
  const setMode = useSetRegistrationMode();
  const modeRole = modeQuery.data?.default_registration_role;

  return {
    tesis: modeRole === TESIS_ROLE,
    savingMode: setMode.isPending,
    modeUnavailable: modeRole === undefined,
    modeError: modeQuery.isError,
    toggleMode: () => {
      if (modeRole === undefined) return;
      setMode.mutate(modeRole === TESIS_ROLE ? "usuario" : TESIS_ROLE);
    },
    retryMode: () => {
      void modeQuery.refetch();
    },
  };
}

export function useAdminRolesController() {
  const rolesQuery = useRoles();
  const mode = useRegistrationModeState();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  const formMutation = editingRole !== null ? updateRole : createRole;

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
    error: rolesQuery.error ? errorMessage(rolesQuery.error, connectError()) : "",
    ...mode,
    isFormOpen,
    editingRole,
    formError: formMutation.error ? errorMessage(formMutation.error, connectError()) : "",
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
    deleteError: deleteRole.error ? errorMessage(deleteRole.error, connectError()) : "",
    isDeleting: deleteRole.isPending,
    confirmDelete,
    cancelDelete,
    retry: () => {
      void rolesQuery.refetch();
    },
  };
}
