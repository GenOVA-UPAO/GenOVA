import { useState } from "react";

import { useCurrentUser } from "@/core/auth/auth-store";
import { Icon } from "@/core/components/icon";
import { PageHeader } from "@/core/components/page-header";

import { EditUserModal } from "../components/users/edit-user-modal";
import { UsersPagination } from "../components/users/users-pagination";
import { UsersPanel } from "../components/users/users-panel";
import { UsersToolbar } from "../components/users/users-toolbar";
import { useRoles } from "../hooks/use-admin-roles";
import { useAdminUsers } from "../hooks/use-admin-users";
import { useAdminUsersController } from "../hooks/use-admin-users-controller";
import { errorMessage } from "../lib/error-message";
import type { AdminUser } from "../lib/types";
import { EMPTY_USERS_PAGE, filterUsers, resolveCurrentUserId } from "../lib/user-display";

export function AdminUsersPage() {
  const me = useCurrentUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const usersQuery = useAdminUsers(page);
  const rolesQuery = useRoles();
  const controller = useAdminUsersController(setEditingUser);

  const usersData = usersQuery.data ?? EMPTY_USERS_PAGE;
  const roles = rolesQuery.data ?? [];
  const totalPages = usersData.total_pages;
  const visibleUsers = filterUsers(usersData.users, search, roleFilter);
  const currentUserId = resolveCurrentUserId(me);
  const isCurrentUserAdmin = me?.role === "administrador";
  const errorText = usersQuery.error
    ? errorMessage(usersQuery.error, "Error al cargar usuarios.")
    : "";

  const handlePageChange = (nextPage: number) => {
    if (nextPage >= 1 && nextPage <= totalPages) setPage(nextPage);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Icon name="users-three" size="text-3xl" className="text-primary" />
            Usuarios
          </span>
        }
        subtitle={`${String(usersData.total_items)} usuarios registrados en la plataforma`}
      />
      <UsersToolbar
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        roles={roles}
      />
      <UsersPanel
        isLoading={usersQuery.isLoading}
        error={errorText}
        users={visibleUsers}
        roles={roles}
        currentUserId={currentUserId}
        isCurrentUserAdmin={isCurrentUserAdmin}
        updatingUserId={controller.updatingUserId}
        searchQuery={search}
        handlers={controller.handlers}
        onRetry={() => {
          void usersQuery.refetch();
        }}
      />
      <UsersPagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
      {editingUser !== null && (
        <EditUserModal
          user={editingUser}
          isSubmitting={controller.isSavingEdit}
          onClose={() => {
            setEditingUser(null);
          }}
          onSave={(fields) => {
            controller.saveEditedUser(editingUser.id, fields, () => {
              setEditingUser(null);
            });
          }}
        />
      )}
    </div>
  );
}
