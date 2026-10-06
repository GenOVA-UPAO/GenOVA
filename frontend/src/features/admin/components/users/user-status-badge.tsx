import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { formatDate } from "@/core/i18n/format";

import type { AdminUser } from "../../lib/types";
import { isLockedOut } from "./status-helpers";

interface UserStatusBadgeProps {
  user: AdminUser;
}

/** Estado de la cuenta: texto con un punto de color que refuerza (no sustituye) el significado. */
export function UserStatusBadge({ user }: Readonly<UserStatusBadgeProps>) {
  const { t } = useTranslation("admin");

  if (user.is_active !== true) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/50" />
        {t("users.status.inactive")}
      </span>
    );
  }

  if (isLockedOut(user)) {
    const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
    return (
      <span
        title={
          lockedUntil
            ? t("users.status.lockedUntil", {
                date: formatDate(lockedUntil, { dateStyle: "short", timeStyle: "short" }),
              })
            : undefined
        }
        className="inline-flex items-center gap-1.5 text-sm font-medium text-destructive"
      >
        <Icon name="lock" size="text-sm" /> {t("users.status.locked")}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
      {t("users.status.active")}
    </span>
  );
}
