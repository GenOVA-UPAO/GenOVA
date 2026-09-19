import { TableCell } from "@/core/components/ui/table";

import type { AdminUser } from "../../lib/types";
import { formatUniversityId, hasPhone, hasUniversityId } from "../../lib/user-display";

interface UserCodeCellProps {
  user: AdminUser;
}

export function UserCodeCell({ user }: Readonly<UserCodeCellProps>) {
  return (
    <TableCell className="text-center">
      <div className="flex w-24 flex-col items-center justify-center">
        {hasUniversityId(user) ? (
          <span className="rounded border border-border/50 bg-muted/40 px-1.5 py-0.5 font-mono text-xs font-medium">
            {formatUniversityId(user.university_id)}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground italic">--</span>
        )}
        {hasPhone(user) && (
          <span className="mt-1 text-[10px] font-medium text-muted-foreground">
            {user.phone_number}
          </span>
        )}
      </div>
    </TableCell>
  );
}
