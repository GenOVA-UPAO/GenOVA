import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";

import { formatRoleDescription, formatRoleName, roleUserCountLabel } from "../lib/role-utils";
import type { Role } from "../lib/types";
import { isSystemRole } from "../pages/admin-roles-page.helpers";
import { RolePermissionsList } from "./role-permissions-list";

interface RoleCardProps {
  role: Role;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

/** Fila de un rol dentro de la lista: nombre, alcance, permisos y acciones. */
export function RoleCard({ role, onEdit, onDelete }: Readonly<RoleCardProps>) {
  const system = isSystemRole(role.name);
  const description = formatRoleDescription(role.description);

  return (
    <li
      data-testid="role-row"
      className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-start md:justify-between md:gap-8"
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h2 className="text-base font-semibold">{formatRoleName(role.name)}</h2>
          {system && <Badge variant="secondary">Sistema</Badge>}
          <span className="text-sm text-muted-foreground tabular-nums">
            {roleUserCountLabel(role.user_count ?? 0)}
          </span>
        </div>
        {description !== "" && (
          <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
        )}
        <RolePermissionsList permissions={role.permissions ?? []} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          className="max-md:h-11 max-md:flex-1"
          onClick={() => {
            onEdit(role);
          }}
        >
          Editar permisos
        </Button>
        {!system && (
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive max-md:h-11"
            onClick={() => {
              onDelete(role);
            }}
          >
            Eliminar
          </Button>
        )}
      </div>
    </li>
  );
}
