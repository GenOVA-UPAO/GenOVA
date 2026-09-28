import { PageHeader } from "@/core/components/page-header";

import { DeactivateUserConfirm } from "../components/users/deactivate-user-confirm";
import { EditUserModal } from "../components/users/edit-user-modal";
import { UsersPagination } from "../components/users/users-pagination";
import { UsersPanel } from "../components/users/users-panel";
import { UsersToolbar } from "../components/users/users-toolbar";
import { useAdminUsersPage } from "../hooks/use-admin-users-page";

export function AdminUsersPage() {
  const p = useAdminUsersPage();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Usuarios" subtitle={p.subtitle} />
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
      {p.pendingDeactivation !== null && (
        <DeactivateUserConfirm
          user={p.pendingDeactivation}
          isDeactivating={p.isDeactivating}
          onConfirm={p.confirmDeactivation}
          onCancel={p.cancelDeactivation}
        />
      )}
    </div>
  );
}
