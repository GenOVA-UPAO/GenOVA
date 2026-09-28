import { ConfirmModal } from "@/core/components/confirm-modal";

import type { AdminUser } from "../../lib/types";
import { displayName } from "../../lib/user-display";

interface DeactivateUserConfirmProps {
  user: AdminUser;
  isDeactivating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeactivateUserConfirm({
  user,
  isDeactivating,
  onConfirm,
  onCancel,
}: Readonly<DeactivateUserConfirmProps>) {
  return (
    <ConfirmModal
      title={`¿Desactivar la cuenta de ${displayName(user) ?? user.email}?`}
      message="No podrá iniciar sesión hasta que vuelvas a activarla. Sus OVAs y sus datos se conservan."
      confirmLabel="Desactivar cuenta"
      loadingLabel="Desactivando…"
      isLoading={isDeactivating}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
