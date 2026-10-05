import { useTranslation } from "react-i18next";
import { ConfirmModal } from "@/core/components/confirm-modal";

interface PlatformKeyDeleteConfirmProps {
  open: boolean;
  providerLabel: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PlatformKeyDeleteConfirm(props: Readonly<PlatformKeyDeleteConfirmProps>) {
  const { t } = useTranslation();
  return (
    <ConfirmModal
      open={props.open}
      title={t("shared:eliminar_la_clave_de_value", { p0: props.providerLabel })}
      message={t("shared:los_usuarios_sin_clave_propia_para_este_prove_a5ac78")}
      confirmLabel={t("shared:eliminar_clave")}
      loadingLabel={t("shared:eliminando")}
      isLoading={props.deleting}
      onConfirm={props.onConfirm}
      onCancel={props.onCancel}
    />
  );
}
