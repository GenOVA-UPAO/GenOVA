import { Button } from "@/core/components/ui/button";

export function RevertConfirm({
  pending,
  onConfirm,
  onCancel,
}: Readonly<{ pending: boolean; onConfirm: () => void; onCancel: () => void }>) {
  return (
    <div role="alert" className="mt-4 space-y-3 rounded-lg border bg-muted/30 p-3">
      <p>¿Restaurar esta versión?</p>
      <div className="flex flex-wrap gap-2">
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
    </div>
  );
}
