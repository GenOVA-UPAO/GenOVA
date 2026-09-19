import { TableCell } from "@/core/components/ui/table";

import type { AdminUser, UsersHandlers } from "../../lib/types";
import { UserActionMenu } from "./user-action-menu";

interface UserActionsCellProps {
  user: AdminUser;
  actionsDisabled: boolean;
  handlers: UsersHandlers;
}

export function UserActionsCell({
  user,
  actionsDisabled,
  handlers,
}: Readonly<UserActionsCellProps>) {
  if (actionsDisabled) {
    return (
      <TableCell className="pr-6 text-center">
        <span className="rounded-md border border-border/50 bg-muted/50 px-2 py-1 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
          Protegido
        </span>
      </TableCell>
    );
  }

  return (
    <TableCell className="pr-6 text-center">
      <UserActionMenu
        user={user}
        onEdit={() => {
          handlers.openEdit(user);
        }}
        onToggleStatus={(isActive) => {
          handlers.handleToggleStatus(user.id, isActive);
        }}
        onUnlock={() => {
          handlers.handleUnlockUser(user.id);
        }}
        onSendResetEmail={() => {
          handlers.handleSendResetEmail(user.id);
        }}
      />
    </TableCell>
  );
}
