import { ConfirmModal } from "@/core/components/confirm-modal";

import type { AdminUser } from "../../lib/types";
import { displayName } from "../../lib/user-display";

interface DeactivateUserConfirmProps {
  user: AdminUser;
  /** Estado al que pasará la cuenta. */
  nextActive: boolean;
  isChanging: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeactivateUserConfirm({
  user,
  nextActive,
  isChanging,
  onConfirm,
  onCancel,
}: Readonly<DeactivateUserConfirmProps>) {
  const name = displayName(user) ?? user.email;
  if (nextActive) {
    return (
      <ConfirmModal
        title={`¿Activar la cuenta de ${name}?`}
        message="Podrá volver a iniciar sesión con su correo y su contraseña."
        confirmLabel="Activar cuenta"
        loadingLabel="Activando…"
        danger={false}
        isLoading={isChanging}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  }
  return (
    <ConfirmModal
      title={`¿Desactivar la cuenta de ${name}?`}
      message="No podrá iniciar sesión hasta que vuelvas a activarla. Sus OVAs y sus datos se conservan."
      confirmLabel="Desactivar cuenta"
      loadingLabel="Desactivando…"
      isLoading={isChanging}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
