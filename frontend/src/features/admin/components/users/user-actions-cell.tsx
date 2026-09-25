import { useState } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { TableCell } from "@/core/components/ui/table";
import { Tooltip } from "@/core/components/ui/tooltip";

import type { AdminUser, UsersHandlers } from "../../lib/types";
import { ResetEmailConfirm } from "./reset-email-confirm";
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
  const [confirmReset, setConfirmReset] = useState(false);
  if (lockReason !== null) {
    return (
      <TableCell className={className}>
        {/* aria-disabled en vez de disabled: sigue siendo enfocable y el tooltip
        explica el motivo también con teclado. */}
        <Tooltip label={lockReason} side="left">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-disabled="true"
            aria-label={`Acciones no disponibles. ${lockReason}`}
            className="cursor-default text-muted-foreground hover:bg-transparent hover:text-muted-foreground max-md:size-11"
          >
            <Icon name="lock" size="text-base" />
          </Button>
        </Tooltip>
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
          setConfirmReset(true);
        }}
      />
      {confirmReset && (
        <ResetEmailConfirm
          user={user}
          onConfirm={() => {
            setConfirmReset(false);
            handlers.handleSendResetEmail(user.id);
          }}
          onCancel={() => {
            setConfirmReset(false);
          }}
        />
      )}
    </TableCell>
  );
}
