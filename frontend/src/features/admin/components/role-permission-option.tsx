import { Icon } from "@/core/components/icon";

import type { Permission } from "../lib/permissions";

interface RolePermissionOptionProps {
  permission: Permission;
  checked: boolean;
  disabled: boolean;
  onToggle: (permissionId: string) => void;
}

/** Casilla de un permiso: toda la fila (nombre y descripción) es el área de clic. */
export function RolePermissionOption({
  permission,
  checked,
  disabled,
  onToggle,
}: Readonly<RolePermissionOptionProps>) {
  return (
    <label className="flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50 has-disabled:cursor-not-allowed">
      <span className="relative mt-0.5 flex items-center justify-center">
        <input
          type="checkbox"
          className="peer size-4 shrink-0 appearance-none rounded-sm border border-primary checked:border-primary checked:bg-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
          checked={checked}
          disabled={disabled}
          onChange={() => {
            onToggle(permission.id);
          }}
        />
        {checked && (
          <Icon
            name="check"
            size="text-xs"
            className="pointer-events-none absolute text-primary-foreground"
          />
        )}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-medium">{permission.label}</span>
        {permission.desc !== undefined && (
          <span className="mt-0.5 text-xs text-muted-foreground">{permission.desc}</span>
        )}
      </span>
    </label>
  );
}
