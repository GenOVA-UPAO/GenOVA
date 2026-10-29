import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("admin");
  const name = displayName(user) ?? user.email;
  return (
    <ConfirmModal
      title={t("users.resetModal.title", { name })}
      message={t("users.resetModal.description", { email: user.email })}
      confirmLabel={t("users.resetModal.confirm")}
      danger={false}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
