import { Icon } from "@/core/components/icon";

import type { AdminUser } from "../../lib/types";
import { isLockedOut } from "./status-helpers";

interface UserStatusBadgeProps {
  user: AdminUser;
}

/** Estado de la cuenta: texto con un punto de color que refuerza (no sustituye) el significado. */
export function UserStatusBadge({ user }: Readonly<UserStatusBadgeProps>) {
  if (user.is_active !== true) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/50" />
        Inactivo
      </span>
    );
  }

  if (isLockedOut(user)) {
    const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
    return (
      <span
        title={lockedUntil ? `Bloqueado hasta ${lockedUntil.toLocaleString("es-PE")}` : undefined}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive"
      >
        <Icon name="lock" size="text-sm" /> Bloqueado
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
      Activo
    </span>
  );
}
