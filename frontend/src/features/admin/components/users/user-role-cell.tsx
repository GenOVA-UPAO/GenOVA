import { TableCell } from "@/core/components/ui/table";

import type { AdminUser, Role } from "../../lib/types";
import { UserRoleSelect } from "./user-role-select";

interface UserRoleCellProps {
  user: AdminUser;
  roles: Role[];
  isMe: boolean;
  isCurrentUserAdmin: boolean;
  disabled: boolean;
  isUpdating: boolean;
  onRoleChange: (roleId: string) => void;
  className?: string;
}

export function UserRoleCell({
  user,
  roles,
  isMe,
  isCurrentUserAdmin,
  disabled,
  isUpdating,
  onRoleChange,
  className,
}: Readonly<UserRoleCellProps>) {
  // El rol actual siempre figura entre las opciones, aunque quien mira no pueda
  // asignarlo: así el selector deshabilitado sigue mostrando el valor real.
  const options = roles.filter(
    (role) => role.name !== "administrador" || isCurrentUserAdmin || role.id === user.role?.id,
  );

  return (
    <TableCell className={className}>
      <UserRoleSelect
        user={user}
        roles={options}
        disabled={disabled || isMe}
        isUpdating={isUpdating}
        onRoleChange={onRoleChange}
      />
    </TableCell>
  );
}
