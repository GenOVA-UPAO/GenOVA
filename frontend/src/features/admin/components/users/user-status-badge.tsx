import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import type { AdminUser } from "../../lib/types";
import { isLockedOut } from "./status-helpers";

const BADGE_CLASS =
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-sm";

interface UserStatusBadgeProps {
  user: AdminUser;
}

export function UserStatusBadge({ user }: Readonly<UserStatusBadgeProps>) {
  const isLocked = isLockedOut(user);

  if (user.is_active !== true) {
    return (
      <span className={cn(BADGE_CLASS, "bg-muted text-muted-foreground border-border")}>
        Inactivo
      </span>
    );
  }

  if (isLocked) {
    const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
    return (
      <span
        title={lockedUntil ? `Bloqueado hasta ${lockedUntil.toLocaleString("es-PE")}` : ""}
        className={cn(BADGE_CLASS, "bg-destructive/10 text-destructive border-destructive/20")}
      >
        <Icon name="lock" size="text-xs" /> Bloqueado
      </span>
    );
  }

  return (
    <span className={cn(BADGE_CLASS, "bg-emerald-500/10 text-emerald-600 border-emerald-500/20")}>
      Activo
    </span>
  );
}
