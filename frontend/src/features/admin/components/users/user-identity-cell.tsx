import { TableCell } from "@/core/components/ui/table";

import type { AdminUser } from "../../lib/types";
import { displayName } from "../../lib/user-display";

interface UserIdentityCellProps {
  user: AdminUser;
  isMe: boolean;
}

export function UserIdentityCell({ user, isMe }: Readonly<UserIdentityCellProps>) {
  const name = displayName(user);

  return (
    <TableCell className="max-w-[240px]">
      <div className="flex items-center gap-2">
        {name !== null ? (
          <p className="truncate text-sm font-bold">{name}</p>
        ) : (
          <span className="text-sm font-normal text-muted-foreground italic">No especificado</span>
        )}
        {user.is_active !== true && (
          <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-muted-foreground uppercase shadow-sm">
            INACTIVO
          </span>
        )}
        {isMe && (
          <span className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-primary uppercase shadow-sm">
            TÚ
          </span>
        )}
      </div>
      <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{user.email}</p>
    </TableCell>
  );
}
