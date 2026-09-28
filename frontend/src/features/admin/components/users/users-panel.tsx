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
  isFiltering: boolean;
  handlers: UsersHandlers;
  onRetry: () => void;
  onClearFilters: () => void;
}

export function UsersPanel({
  isLoading,
  error,
  users,
  roles,
  currentUserId,
  isCurrentUserAdmin,
  updatingUserId,
  isFiltering,
  handlers,
  onRetry,
  onClearFilters,
}: Readonly<UsersPanelProps>) {
  let content = (
    <UsersTable
      users={users}
      roles={roles}
      currentUserId={currentUserId}
      isCurrentUserAdmin={isCurrentUserAdmin}
      updatingUserId={updatingUserId}
      handlers={handlers}
    />
  );

  if (isLoading) {
    content = <UsersSkeleton />;
  } else if (error !== "") {
    return <QueryErrorState title="No se pudieron cargar los usuarios" onRetry={onRetry} />;
  } else if (users.length === 0) {
    return <UsersEmpty isFiltering={isFiltering} onClearFilters={onClearFilters} />;
  }

  return <div className="overflow-hidden rounded-xl border border-border bg-card">{content}</div>;
}
