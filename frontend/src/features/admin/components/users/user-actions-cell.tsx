import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { TableCell } from "@/core/components/ui/table";

import type { AdminUser, UsersHandlers } from "../../lib/types";
import { UserActionMenu } from "./user-action-menu";

interface UserActionsCellProps {
  user: AdminUser;
  /** Motivo por el que la fila no admite acciones; `null` si las admite. */
  lockReason: string | null;
  handlers: UsersHandlers;
  className?: string;
}

export function UserActionsCell({
  user,
  lockReason,
  handlers,
  className,
}: Readonly<UserActionsCellProps>) {
  if (lockReason !== null) {
    return (
      <TableCell className={className}>
        <span title={lockReason} className="inline-flex">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled
            aria-label={`Acciones no disponibles. ${lockReason}`}
            className="max-md:size-10"
          >
            <Icon name="lock" size="text-base" />
          </Button>
        </span>
      </TableCell>
    );
  }

  return (
    <TableCell className={className}>
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
