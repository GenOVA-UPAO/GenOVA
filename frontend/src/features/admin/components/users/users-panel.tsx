import { QueryErrorState } from "@/core/components/query-error-state";

import type { AdminUser, Role, UsersHandlers } from "../../lib/types";
import { UsersEmpty } from "./users-empty";
import { UsersSkeleton } from "./users-skeleton";
import { UsersTable } from "./users-table";

interface UsersPanelProps {
  isLoading: boolean;
  error: string;
  users: AdminUser[];
  roles: Role[];
  currentUserId: string;
  isCurrentUserAdmin: boolean;
  updatingUserId: string;
  searchQuery: string;
  handlers: UsersHandlers;
  onRetry: () => void;
  onClearSearch: () => void;
}

export function UsersPanel({
  isLoading,
  error,
  users,
  roles,
  currentUserId,
  isCurrentUserAdmin,
  updatingUserId,
  searchQuery,
  handlers,
  onRetry,
  onClearSearch,
}: Readonly<UsersPanelProps>) {
  let content = (
    <UsersTable
      users={users}
      roles={roles}
      currentUserId={currentUserId}
      isCurrentUserAdmin={isCurrentUserAdmin}
      updatingUserId={updatingUserId}
      searchQuery={searchQuery}
      handlers={handlers}
    />
  );

  if (isLoading) {
    content = <UsersSkeleton />;
  } else if (error !== "") {
    content = <QueryErrorState title="No se pudieron cargar los usuarios" onRetry={onRetry} />;
  } else if (users.length === 0) {
    content = <UsersEmpty searchQuery={searchQuery} onClearSearch={onClearSearch} />;
  }

  return (
    <div className="glass-card overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      {content}
    </div>
  );
}
