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
  return (
    <ConfirmModal
      title={`¿Restaurar la versión ${versionNumber}?`}
      message={`El OVA volverá a tener el contenido de la versión ${versionNumber}.`}
      confirmLabel="Restaurar versión"
      danger={false}
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
