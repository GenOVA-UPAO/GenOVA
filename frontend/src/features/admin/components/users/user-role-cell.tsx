import { TableCell } from "@/core/components/ui/table";
import { cn } from "@/core/lib/cn";

import { getRoleColorClasses } from "../../lib/role-utils";
import type { AdminUser, Role } from "../../lib/types";
import { roleIdOf, roleNameOf, roleSelectLabel } from "../../lib/user-display";
import { RoleBadge } from "./role-badge";

interface UserRoleCellProps {
  user: AdminUser;
  roles: Role[];
  isMe: boolean;
  isCurrentUserAdmin: boolean;
  disabled: boolean;
  isUpdating: boolean;
  onRoleChange: (roleId: string) => void;
}

function selectableRoles(roles: Role[], isCurrentUserAdmin: boolean): Role[] {
  return roles.filter((role) => role.name !== "administrador" || isCurrentUserAdmin);
}

export function UserRoleCell({
  user,
  roles,
  isMe,
  isCurrentUserAdmin,
  disabled,
  isUpdating,
  onRoleChange,
}: Readonly<UserRoleCellProps>) {
  const roleColorClasses = getRoleColorClasses(roleNameOf(user));

  if (isMe) {
    return (
      <TableCell>
        <RoleBadge name={roleNameOf(user)} className={roleColorClasses} />
      </TableCell>
    );
  }

  return (
    <TableCell>
      <div className="flex items-center gap-2">
        <select
          value={roleIdOf(user)}
          onChange={(event) => {
            onRoleChange(event.target.value);
          }}
          aria-label={roleSelectLabel(user)}
          disabled={isUpdating || disabled}
          className={cn(
            "h-8 w-[170px] cursor-pointer rounded-xl border border-border/50 bg-background/50 px-3 text-[11px] font-bold tracking-wider uppercase shadow-sm backdrop-blur-md transition-colors hover:bg-accent/50 focus:outline-none disabled:opacity-50",
            roleColorClasses,
          )}
        >
          {roleIdOf(user) === "" && (
            <option value="" disabled>
              Sin rol
            </option>
          )}
          {selectableRoles(roles, isCurrentUserAdmin).map((role) => (
            <option
              key={role.id}
              value={role.id}
              className="bg-popover font-medium text-foreground normal-case"
            >
              {role.name}
            </option>
          ))}
        </select>
        {isUpdating && (
          <div className="size-3 animate-spin rounded-full border-2 border-muted border-t-primary" />
        )}
      </div>
    </TableCell>
  );
}
