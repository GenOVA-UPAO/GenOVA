import { Button } from "@/core/components/ui/button";

export function RevertConfirm({
  pending,
  onConfirm,
  onCancel,
}: Readonly<{ pending: boolean; onConfirm: () => void; onCancel: () => void }>) {
  return (
    <div role="alert">
      <p>¿Restaurar esta versión?</p>
      <Button
        disabled={pending}
        onClick={onConfirm}
      >
        Confirmar restauración
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
