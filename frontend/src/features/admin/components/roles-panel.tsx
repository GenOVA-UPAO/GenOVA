import { EmptyState } from "@/core/components/empty-state";
import { QueryErrorState } from "@/core/components/query-error-state";
import { SkeletonGrid } from "@/core/components/skeleton-grid";
import { Button } from "@/core/components/ui/button";

import type { Role } from "../lib/types";
import { RoleList } from "./role-list";

interface RolesPanelProps {
  isLoading: boolean;
  error: string;
  roles: Role[];
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RolesPanel({
  isLoading,
  error,
  roles,
  onRetry,
  onCreate,
  onEdit,
  onDelete,
}: Readonly<RolesPanelProps>) {
  if (isLoading) {
    return (
      <SkeletonGrid
        count={3}
        className="sm:grid-cols-1 lg:grid-cols-1"
        itemClassName="h-36"
        label="Cargando roles"
      />
    );
  }

  if (error !== "") {
    return <QueryErrorState title="No se pudieron cargar los roles" onRetry={onRetry} />;
  }

  if (roles.length === 0) {
    return (
      <EmptyState
        icon="shield-check"
        title="Aún no hay roles"
        description="Crea el primer conjunto de permisos para los perfiles del sistema."
        action={
          <Button onClick={onCreate}>
            Nuevo rol
          </Button>
        }
      />
    );
  }

  return <RoleList roles={roles} onEdit={onEdit} onDelete={onDelete} />;
}
