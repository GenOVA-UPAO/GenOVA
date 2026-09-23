import { Icon } from "@/core/components/icon";

import { AVAILABLE_PERMISSIONS } from "../lib/permissions";

interface RolePermissionsFieldsetProps {
  permissions: string[];
  disabled: boolean;
  onToggle: (permissionId: string) => void;
}

export function RolePermissionsFieldset({
  permissions,
  disabled,
  onToggle,
}: Readonly<RolePermissionsFieldsetProps>) {
  return (
    <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
      {AVAILABLE_PERMISSIONS.map((permission) => {
        const checked = permissions.includes(permission.id);
        return (
          <label
            key={permission.id}
            className="flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
          >
            <span className="relative mt-0.5 flex items-center justify-center">
              <input
                type="checkbox"
                className="peer size-4 shrink-0 appearance-none rounded-sm border border-primary ring-offset-background checked:border-primary checked:bg-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
              <span className="mt-0.5 text-xs text-muted-foreground">{permission.desc}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
