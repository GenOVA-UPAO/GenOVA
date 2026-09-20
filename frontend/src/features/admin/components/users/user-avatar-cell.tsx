import { TableCell } from "@/core/components/ui/table";
import { cn } from "@/core/lib/cn";

import type { AdminUser } from "../../lib/types";
import { getUserInitials } from "../../lib/user-display";

interface UserAvatarCellProps {
  user: AdminUser;
}

export function UserAvatarCell({ user }: Readonly<UserAvatarCellProps>) {
  return (
    <TableCell className="pl-6">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-bold shadow-sm",
          user.is_active === true
            ? "bg-gradient-to-br from-primary/20 to-accent-brand/20 text-primary border-primary/20"
            : "bg-muted text-muted-foreground border-border",
        )}
      >
        {getUserInitials(user)}
      </div>
    </TableCell>
  );
}
