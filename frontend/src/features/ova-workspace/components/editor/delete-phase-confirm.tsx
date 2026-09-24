import { ConfirmModal } from "@/core/components/confirm-modal";

interface Props {
  name: string;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmación antes de quitar un recurso del OVA. */
export function DeletePhaseConfirm({ name, isLoading, onConfirm, onCancel }: Readonly<Props>) {
  return (
    <ConfirmModal
      title="¿Eliminar este recurso?"
      message={`Se quitará «${name}» del OVA.`}
      confirmLabel="Eliminar recurso"
      loadingLabel="Eliminando…"
      isLoading={isLoading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
