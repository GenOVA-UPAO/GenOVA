import { useTranslation } from "react-i18next";

import { ConfirmModal } from "@/core/components/confirm-modal";

interface Props {
  name: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmación antes de quitar un recurso del OVA. */
export function DeletePhaseConfirm({ name, isLoading, onConfirm, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <ConfirmModal
      title={t("workspace:eliminar_este_recurso")}
      message={t("workspace:se_quitara_value_del_ova", { p0: name })}
      confirmLabel={t("workspace:eliminar_recurso")}
      loadingLabel={t("workspace:eliminando")}
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
