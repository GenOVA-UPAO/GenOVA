import { Button } from "@/core/components/ui/button";

import type { Role } from "../lib/types";
import { RoleList } from "./role-list";

interface RolesPanelProps {
  isLoading: boolean;
  error: string;
  roles: Role[];
  onRetry: () => void;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RolesPanel({
  isLoading,
  error,
  roles,
  onRetry,
  onEdit,
  onDelete,
}: Readonly<RolesPanelProps>) {
  if (isLoading) {
    return (
      <div className="glass-card flex h-64 items-center justify-center rounded-3xl border border-border bg-card">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary shadow-sm" />
          <p className="text-sm font-bold text-muted-foreground">Cargando roles...</p>
        </div>
      </div>
    );
  }

  if (error !== "") {
    return (
      <div className="glass-card flex h-64 items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <div className="max-w-md space-y-4">
          <p className="text-sm font-bold text-destructive">{error}</p>
          <Button variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return <RoleList roles={roles} onEdit={onEdit} onDelete={onDelete} />;
}
