import { ConfirmModal } from "@/core/components/confirm-modal";

import type { AdminUser } from "../../lib/types";
import { displayName } from "../../lib/user-display";

interface ResetEmailConfirmProps {
  user: AdminUser;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Escribir a un usuario no se deshace: se confirma a quién va antes de enviarlo. */
export function ResetEmailConfirm({ user, onConfirm, onCancel }: Readonly<ResetEmailConfirmProps>) {
  const name = displayName(user) ?? user.email;
  return (
    <ConfirmModal
      title={`¿Enviar a ${name} un correo para restablecer su contraseña?`}
      message={`Le llegará a ${user.email} un enlace para elegir una contraseña nueva, válido 24 horas. Su contraseña actual sigue funcionando hasta que la cambie.`}
      confirmLabel="Enviar correo"
      danger={false}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
