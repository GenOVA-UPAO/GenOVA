import { Button } from "@/core/components/ui/button";

export function PhaseDeleteConfirm({
  pending,
  onConfirm,
  onCancel,
}: Readonly<{ pending: boolean; onConfirm: () => void; onCancel: () => void }>) {
  return (
    <div role="alert">
      <p>¿Eliminar este recurso?</p>
      <Button
        variant="destructive"
        disabled={pending}
        onClick={onConfirm}
      >
        Confirmar eliminación
      </Button>
      <Button
        variant="ghost"
        onClick={onCancel}
      >
        Cancelar
      </Button>
    </div>
  );
}
