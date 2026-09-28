import { useState } from "react";

import type { AdminUser, UsersHandlers } from "../lib/types";

interface DeactivateConfirmOptions {
  users: AdminUser[];
  handlers: UsersHandlers;
  deactivate: (userId: string, onSuccess: () => void) => void;
}

/**
 * Desactivar una cuenta deja a esa persona sin acceso, así que se confirma antes;
 * activarla no necesita confirmación.
 */
export function useDeactivateConfirm({ users, handlers, deactivate }: DeactivateConfirmOptions) {
  const [pending, setPending] = useState<AdminUser | null>(null);

  const guardedHandlers: UsersHandlers = {
    ...handlers,
    handleToggleStatus: (userId, isActive) => {
      if (isActive) {
        handlers.handleToggleStatus(userId, true);
        return;
      }
      setPending(users.find((user) => user.id === userId) ?? null);
    },
  };

  return {
    handlers: guardedHandlers,
    pendingDeactivation: pending,
    confirmDeactivation: () => {
      if (pending === null) return;
      deactivate(pending.id, () => {
        setPending(null);
      });
    },
    cancelDeactivation: () => {
      setPending(null);
    },
  };
}
