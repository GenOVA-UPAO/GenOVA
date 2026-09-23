import { TableCell } from "@/core/components/ui/table";

import type { AdminUser } from "../../lib/types";
import { displayName, userContactLine } from "../../lib/user-display";
import { UserAvatar } from "./user-avatar";

interface UserIdentityCellProps {
  user: AdminUser;
  isMe: boolean;
  className?: string;
}

export function UserIdentityCell({ user, isMe, className }: Readonly<UserIdentityCellProps>) {
  const name = displayName(user);
  const contact = userContactLine(user);

  return (
    <TableCell className={className}>
      <div className="flex min-w-0 items-center gap-3">
        <UserAvatar user={user} />
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2">
            {name !== null ? (
              <span className="truncate text-sm font-semibold">{name}</span>
            ) : (
              <span className="text-sm text-muted-foreground italic">Sin nombre</span>
            )}
            {isMe && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/20">
                Tú
              </span>
            )}
          </p>
          <p className="truncate text-xs text-muted-foreground" title={user.email}>
            {user.email}
          </p>
          {contact !== "" && (
            <p className="truncate text-xs text-muted-foreground tabular-nums">{contact}</p>
          )}
        </div>
      </div>
    </TableCell>
  );
}
