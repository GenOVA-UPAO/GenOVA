import { TableCell, TableRow } from "@/core/components/ui/table";

import type { AdminUser, Role, UsersHandlers } from "../../lib/types";
import { UserActionsCell } from "./user-actions-cell";
import { UserIdentityCell } from "./user-identity-cell";
import { UserRoleCell } from "./user-role-cell";
import { UserStatusBadge } from "./user-status-badge";

// En móvil la fila deja de ser tabla y se vuelve una rejilla de dos columnas:
// identidad y menú arriba; rol y estado debajo, alineados con el nombre.
const ROW_CLASS =
  "hover:bg-muted/40 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-center max-md:gap-x-3 max-md:gap-y-1 max-md:px-4 max-md:py-3";
const CELL = "px-4 py-3 max-md:p-0";

interface UserRowProps {
  user: AdminUser;
  roles: Role[];
  currentUserId: string;
  isCurrentUserAdmin: boolean;
  isUpdating: boolean;
  handlers: UsersHandlers;
}

function lockReasonFor(isMe: boolean, isProtected: boolean): string | null {
  if (isMe) return "Tu propia cuenta no se modifica desde aquí";
  if (isProtected) return "Solo un administrador puede modificar esta cuenta";
  return null;
}

export function UserRow({
  user,
  roles,
  currentUserId,
  isCurrentUserAdmin,
  isUpdating,
  handlers,
}: Readonly<UserRowProps>) {
  const isMe = user.id === currentUserId;
  const isProtected = user.role?.name === "administrador" && !isCurrentUserAdmin;
  const lockReason = lockReasonFor(isMe, isProtected);

  return (
    <TableRow className={ROW_CLASS}>
      <UserIdentityCell
        user={user}
        isMe={isMe}
        className={`${CELL} max-w-80 max-md:col-start-1 max-md:row-start-1 max-md:max-w-none`}
      />
      <UserRoleCell
        user={user}
        roles={roles}
        isMe={isMe}
        isCurrentUserAdmin={isCurrentUserAdmin}
        disabled={lockReason !== null}
        isUpdating={isUpdating}
        onRoleChange={(roleId) => {
          handlers.handleRoleChange(user.id, roleId);
        }}
        className={`${CELL} max-md:col-start-1 max-md:row-start-2 max-md:pl-12`}
      />
      <TableCell className={`${CELL} max-md:col-start-2 max-md:row-start-2 max-md:justify-self-end`}>
        <UserStatusBadge user={user} />
      </TableCell>
      <UserActionsCell
        user={user}
        lockReason={lockReason}
        handlers={handlers}
        className={`${CELL} w-12 text-right max-md:col-start-2 max-md:row-start-1 max-md:w-auto max-md:justify-self-end`}
      />
    </TableRow>
  );
}
