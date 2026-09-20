import { getPermissionLabel } from "../lib/permissions";

interface RolePermissionsListProps {
  permissions: string[];
}

export function RolePermissionsList({ permissions }: Readonly<RolePermissionsListProps>) {
  if (permissions.length === 0) {
    return (
      <span className="rounded-full bg-muted/30 px-3 py-1 text-xs font-bold text-muted-foreground">
        Sin permisos asignados
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {permissions.map((permission) => (
        <span
          key={permission}
          className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary shadow-sm"
        >
          {getPermissionLabel(permission)}
        </span>
      ))}
    </div>
  );
}
