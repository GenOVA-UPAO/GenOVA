import { ConfirmModal } from "@/core/components/confirm-modal";

interface PlatformKeyDeleteConfirmProps {
  open: boolean;
  providerLabel: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PlatformKeyDeleteConfirm(props: Readonly<PlatformKeyDeleteConfirmProps>) {
  return (
    <ConfirmModal
      open={props.open}
      title={`¿Eliminar la clave de ${props.providerLabel}?`}
      message="Los usuarios sin clave propia para este proveedor no podrán usar sus modelos hasta que configures otra."
      confirmLabel="Eliminar clave"
      loadingLabel="Eliminando…"
      isLoading={props.deleting}
      onConfirm={props.onConfirm}
      onCancel={props.onCancel}
    />
  );
}
