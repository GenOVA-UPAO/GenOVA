import { useState } from "react";

import { useCurrentUser } from "@/core/auth/auth-store";

import { errorMessage } from "../lib/error-message";
import { type AdminUser, ALL_ROLE_FILTER, type UserEditPayload } from "../lib/types";
import { EMPTY_USERS_PAGE, resolveCurrentUserId, usersPageSubtitle } from "../lib/user-display";
import { useRoles } from "./use-admin-roles";
import { useAdminUsers } from "./use-admin-users";
import { useAdminUsersController } from "./use-admin-users-controller";
import { useAdminUsersFilters } from "./use-admin-users-filters";
import { useDeactivateConfirm } from "./use-deactivate-confirm";

export function useAdminUsersPage() {
  const me = useCurrentUser();
  const filters = useAdminUsersFilters();
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const usersQuery = useAdminUsers({
    page: filters.page,
    search: filters.debouncedSearch,
    roleId: filters.roleFilter,
  });
  const rolesQuery = useRoles();
  const controller = useAdminUsersController(setEditingUser);
  const usersData = usersQuery.data ?? EMPTY_USERS_PAGE;
  const deactivation = useDeactivateConfirm({
    users: usersData.users,
    handlers: controller.handlers,
    deactivate: controller.deactivateUser,
  });
  const errorText = usersQuery.error
    ? errorMessage(usersQuery.error, "Error al cargar usuarios.")
    : "";

  const saveEditedUser = (fields: UserEditPayload) => {
    if (editingUser === null) return;
    controller.saveEditedUser(editingUser.id, fields, () => {
      setEditingUser(null);
    });
  };

  return {
    ...filters,
    editingUser,
    users: usersData.users,
    roles: rolesQuery.data ?? [],
    totalPages: usersData.total_pages,
    currentUserId: resolveCurrentUserId(me),
    isCurrentUserAdmin: me?.role === "administrador",
    updatingUserId: controller.updatingUserId,
    isSavingEdit: controller.isSavingEdit,
    handlers: deactivation.handlers,
    pendingDeactivation: deactivation.pendingDeactivation,
    isDeactivating: controller.isDeactivating,
    confirmDeactivation: deactivation.confirmDeactivation,
    cancelDeactivation: deactivation.cancelDeactivation,
    isLoading: usersQuery.isLoading,
    errorText,
    isFiltering: filters.search !== "" || filters.roleFilter !== ALL_ROLE_FILTER,
    subtitle: usersPageSubtitle(usersQuery.isLoading, errorText !== "", usersData.total_items),
    handlePageChange: (nextPage: number) => {
      if (nextPage >= 1 && nextPage <= usersData.total_pages) filters.setPage(nextPage);
    },
    retry: () => {
      void usersQuery.refetch();
    },
    closeEdit: () => {
      setEditingUser(null);
    },
    saveEditedUser,
  };
}
