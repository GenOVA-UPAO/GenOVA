import { Button } from "@/core/components/ui/button";

import type { AdminUser, Role, UsersHandlers } from "../../lib/types";
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
    content = (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary shadow-sm" />
          <p className="text-sm font-bold text-muted-foreground">Cargando usuarios...</p>
        </div>
      </div>
    );
  } else if (error !== "") {
    content = (
      <div className="flex h-[400px] items-center justify-center bg-destructive/5 p-6 text-center">
        <div className="max-w-md space-y-4">
          <p className="text-sm font-bold text-destructive">{error}</p>
          <Button variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      {content}
    </div>
  );
}
