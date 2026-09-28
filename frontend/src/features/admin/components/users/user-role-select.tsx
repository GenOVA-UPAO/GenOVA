import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

import { formatRoleName } from "../../lib/role-utils";
import type { AdminUser, Role } from "../../lib/types";
import { roleIdOf, roleSelectLabel } from "../../lib/user-display";

interface UserRoleSelectProps {
  user: AdminUser;
  roles: Role[];
  disabled: boolean;
  isUpdating: boolean;
  onRoleChange: (roleId: string) => void;
}

/** Selector de rol ligero: parece texto hasta que se pasa el cursor o se enfoca. */
export function UserRoleSelect({
  user,
  roles,
  disabled,
  isUpdating,
  onRoleChange,
}: Readonly<UserRoleSelectProps>) {
  const roleId = roleIdOf(user);

  return (
    <div className="flex items-center gap-2">
      <Select value={roleId === "" ? undefined : roleId} onValueChange={onRoleChange}>
        <SelectTrigger
          size="sm"
          aria-label={roleSelectLabel(user)}
          aria-busy={isUpdating || undefined}
          disabled={isUpdating || disabled}
          className="-ml-2.5 w-44 max-w-full border-transparent bg-transparent shadow-none hover:border-border hover:bg-background disabled:cursor-default disabled:opacity-100 disabled:hover:border-transparent disabled:hover:bg-transparent data-[state=open]:border-border dark:bg-transparent dark:hover:bg-input/30 [&:disabled_svg]:invisible"
        >
          <SelectValue placeholder="Sin rol" />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          {roles.map((role) => (
            <SelectItem key={role.id} value={role.id}>
              {formatRoleName(role.name)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isUpdating && (
        <span
          aria-hidden="true"
          className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-muted border-t-primary"
        />
      )}
    </div>
  );
}
