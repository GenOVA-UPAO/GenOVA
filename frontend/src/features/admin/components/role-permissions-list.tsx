import { getPermissionLabel } from "../lib/permissions";

interface RolePermissionsListProps {
  permissions: string[];
}

export function RolePermissionsList({ permissions }: Readonly<RolePermissionsListProps>) {
  if (permissions.length === 0) {
    return <p className="text-sm text-muted-foreground italic">Sin permisos asignados</p>;
  }

  return (
    <ul aria-label="Permisos" className="flex flex-wrap gap-1.5">
      {permissions.map((permission) => (
        <li
          key={permission}
          className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-foreground/80"
        >
          {getPermissionLabel(permission)}
        </li>
      ))}
    </ul>
  );
}
