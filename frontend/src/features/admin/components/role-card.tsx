import { Badge } from "@/core/components/ui/badge";

import { formatRoleDescription, formatRoleName, roleUserCountLabel } from "../lib/role-utils";
import type { Role } from "../lib/types";
import { isSystemRole } from "../pages/admin-roles-page.helpers";
import { RoleCardActions } from "./role-card-actions";
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
      {/* El servidor rechaza cualquier cambio en los roles del sistema: en lugar de
      ofrecer un formulario que siempre falla, se explica por qué no se edita. */}
      {system ? (
        <p className="text-sm text-muted-foreground md:max-w-52 md:text-right">
          Los roles del sistema no se editan ni se eliminan.
        </p>
      ) : (
        <RoleCardActions role={role} onEdit={onEdit} onDelete={onDelete} />
      )}
    </li>
  );
}
