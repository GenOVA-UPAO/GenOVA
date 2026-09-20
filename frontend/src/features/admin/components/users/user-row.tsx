import { TableCell, TableRow } from "@/core/components/ui/table";

import type { AdminUser, Role, UsersHandlers } from "../../lib/types";
import { UserActionsCell } from "./user-actions-cell";
import { UserAvatarCell } from "./user-avatar-cell";
import { UserCodeCell } from "./user-code-cell";
import { UserIdentityCell } from "./user-identity-cell";
import { UserRoleCell } from "./user-role-cell";
import { UserStatusBadge } from "./user-status-badge";

interface UserRowProps {
  user: AdminUser;
  roles: Role[];
  currentUserId: string;
  isCurrentUserAdmin: boolean;
  isUpdating: boolean;
  handlers: UsersHandlers;
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
  const actionsDisabled = isMe || isProtected;

  return (
    <TableRow className="hover:bg-accent/30">
      <UserAvatarCell user={user} />
      <UserIdentityCell user={user} isMe={isMe} />
      <UserCodeCell user={user} />
      <UserRoleCell
        user={user}
        roles={roles}
        isMe={isMe}
        isCurrentUserAdmin={isCurrentUserAdmin}
        disabled={actionsDisabled}
        isUpdating={isUpdating}
        onRoleChange={(roleId) => {
          handlers.handleRoleChange(user.id, roleId);
        }}
      />
      <TableCell className="text-center">
        <UserStatusBadge user={user} />
      </TableCell>
      <UserActionsCell user={user} actionsDisabled={actionsDisabled} handlers={handlers} />
    </TableRow>
  );
}
