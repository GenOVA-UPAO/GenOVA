import { cn } from "@/core/lib/cn";

import type { AdminUser } from "../../lib/types";
import { getUserInitials } from "../../lib/user-display";

interface UserAvatarProps {
  user: AdminUser;
}

/** Iniciales del usuario; las cuentas inactivas se atenúan. */
export function UserAvatar({ user }: Readonly<UserAvatarProps>) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        user.is_active === true
          ? "bg-primary/10 text-primary dark:bg-primary/20"
          : "bg-muted text-muted-foreground",
      )}
    >
      {getUserInitials(user)}
    </span>
  );
}
