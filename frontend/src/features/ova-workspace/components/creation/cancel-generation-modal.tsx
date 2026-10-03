import { ConfirmModal } from "@/core/components/confirm-modal";

import type { useOvaJob } from "../../hooks/use-ova-job";

export function CancelGenerationModal({
  cancel,
  onClose,
}: Readonly<{ cancel: ReturnType<typeof useOvaJob>["cancel"]; onClose: () => void }>) {
  return (
    <ConfirmModal
      title="¿Cancelar la generación?"
      message="Los recursos que aún no se generaron no se crearán. Podrás reintentarlos desde Mis OVAs."
      confirmLabel="Cancelar generación"
      loadingLabel="Cancelando…"
      isLoading={cancel.isPending}
      onConfirm={() => {
        cancel.mutate(undefined, { onSettled: onClose });
      }}
      onCancel={onClose}
    />
  );
}
