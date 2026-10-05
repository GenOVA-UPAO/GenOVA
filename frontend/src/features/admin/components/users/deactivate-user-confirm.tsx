import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("admin");
  const name = displayName(user) ?? user.email;

  if (nextActive) {
    return (
      <ConfirmModal
        title={t("users.deactivateModal.activateTitle", { name })}
        message={t("users.deactivateModal.activateDesc")}
        confirmLabel={t("users.deactivateModal.activateConfirm")}
        loadingLabel={t("users.deactivateModal.activating")}
        danger={false}
        isLoading={isChanging}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  }
  return (
    <ConfirmModal
      title={t("users.deactivateModal.deactivateTitle", { name })}
      message={t("users.deactivateModal.deactivateDesc")}
      confirmLabel={t("users.deactivateModal.deactivateConfirm")}
      loadingLabel={t("users.deactivateModal.deactivating")}
      isLoading={isChanging}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
