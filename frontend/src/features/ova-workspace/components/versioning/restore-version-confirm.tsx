import { useTranslation } from "react-i18next";

import { ConfirmModal } from "@/core/components/confirm-modal";

interface Props {
  versionNumber: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmación antes de restaurar una versión anterior del OVA. */
export function RestoreVersionConfirm({
  versionNumber,
  isLoading,
  onConfirm,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation("workspace-versioning");
  return (
    <ConfirmModal
      title={t("confirm.title", { number: versionNumber })}
      message={t("confirm.message", { number: versionNumber })}
      confirmLabel={t("confirm.confirm")}
      danger={false}
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
