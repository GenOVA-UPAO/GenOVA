import { useTranslation } from "react-i18next";

import { ConfirmModal } from "@/core/components/confirm-modal";

import type { useOvaJob } from "../../hooks/use-ova-job";

export function CancelGenerationModal({
  cancel,
  onClose,
}: Readonly<{ cancel: ReturnType<typeof useOvaJob>["cancel"]; onClose: () => void }>) {
  const { t } = useTranslation();
  return (
    <ConfirmModal
      title={t("workspace:cancelar_la_generacion")}
      message={t("workspace:generationCancelHint")}
      confirmLabel={t("workspace:cancelar_generacion")}
      loadingLabel={t("workspace:cancelando")}
      isLoading={cancel.isPending}
      onConfirm={() => {
        cancel.mutate(undefined, { onSettled: onClose });
      }}
      onCancel={onClose}
    />
  );
}
