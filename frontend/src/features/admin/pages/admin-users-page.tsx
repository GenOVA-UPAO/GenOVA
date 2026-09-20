import { Icon } from "@/core/components/icon";
import { PageHeader } from "@/core/components/page-header";

import { EditUserModal } from "../components/users/edit-user-modal";
import { UsersPagination } from "../components/users/users-pagination";
import { UsersPanel } from "../components/users/users-panel";
import { UsersToolbar } from "../components/users/users-toolbar";
import { useAdminUsersPage } from "../hooks/use-admin-users-page";

export function AdminUsersPage() {
  const p = useAdminUsersPage();

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Icon name="users-three" size="text-3xl" className="text-primary" />
            Usuarios
          </span>
        }
        subtitle={p.subtitle}
      />
      <UsersToolbar
        search={p.search}
        onSearchChange={p.onSearchChange}
        roleFilter={p.roleFilter}
        onRoleFilterChange={p.onRoleFilterChange}
        roles={p.roles}
      />
      <UsersPanel
        isLoading={p.isLoading}
        error={p.errorText}
        users={p.users}
        roles={p.roles}
        currentUserId={p.currentUserId}
        isCurrentUserAdmin={p.isCurrentUserAdmin}
        updatingUserId={p.updatingUserId}
        searchQuery={p.search}
        isFiltering={p.isFiltering}
        handlers={p.handlers}
        onRetry={p.retry}
        onClearFilters={p.onClearFilters}
      />
      <UsersPagination page={p.page} totalPages={p.totalPages} onPageChange={p.handlePageChange} />
      {p.editingUser !== null && (
        <EditUserModal
          user={p.editingUser}
          isSubmitting={p.isSavingEdit}
          onClose={p.closeEdit}
          onSave={p.saveEditedUser}
        />
      )}
    </div>
  );
}
