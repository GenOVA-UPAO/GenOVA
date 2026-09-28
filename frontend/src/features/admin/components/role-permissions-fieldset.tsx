import { AVAILABLE_PERMISSIONS, PERMISSION_GROUPS } from "../lib/permissions";
import { RolePermissionOption } from "./role-permission-option";

interface RolePermissionsFieldsetProps {
  permissions: string[];
  disabled: boolean;
  onToggle: (permissionId: string) => void;
}

/**
 * Permisos agrupados por tema. Sin altura máxima propia: una lista con scroll
 * dentro de un diálogo que también hace scroll escondía la mitad de las opciones.
 */
export function RolePermissionsFieldset({
  permissions,
  disabled,
  onToggle,
}: Readonly<RolePermissionsFieldsetProps>) {
  return (
    <div className="space-y-4">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.id} role="group" aria-labelledby={`perm-group-${group.id}`}>
          <p id={`perm-group-${group.id}`} className="mb-1.5 text-xs font-medium text-muted-foreground">
            {group.label}
          </p>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
            {AVAILABLE_PERMISSIONS.filter((permission) => permission.group === group.id).map(
              (permission) => (
                <RolePermissionOption
                  key={permission.id}
                  permission={permission}
                  checked={permissions.includes(permission.id)}
                  disabled={disabled}
                  onToggle={onToggle}
                />
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
