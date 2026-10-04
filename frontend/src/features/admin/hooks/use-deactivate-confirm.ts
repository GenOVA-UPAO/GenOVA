import { useState } from "react";

import type { AdminUser, UsersHandlers } from "../lib/types";

export interface PendingStatusChange {
  user: AdminUser;
  /** Estado al que pasará la cuenta si se confirma. */
  nextActive: boolean;
}

interface StatusConfirmOptions {
  users: AdminUser[];
  handlers: UsersHandlers;
  setStatus: (userId: string, isActive: boolean, onSuccess: () => void) => void;
}

/**
 * Activar o desactivar una cuenta cambia el acceso de esa persona, así que
 * ambas acciones se confirman antes de enviarse.
 */
export function useDeactivateConfirm({ users, handlers, setStatus }: StatusConfirmOptions) {
  const [pending, setPending] = useState<PendingStatusChange | null>(null);

  const guardedHandlers: UsersHandlers = {
    ...handlers,
    handleToggleStatus: (userId, isActive) => {
      const user = users.find((u) => u.id === userId);
      setPending(user ? { user, nextActive: isActive } : null);
    },
  };

  return {
    handlers: guardedHandlers,
    pendingStatusChange: pending,
    confirmStatusChange: () => {
      if (pending === null) return;
      setStatus(pending.user.id, pending.nextActive, () => {
        setPending(null);
      });
    },
    cancelStatusChange: () => {
      setPending(null);
    },
  };
}
