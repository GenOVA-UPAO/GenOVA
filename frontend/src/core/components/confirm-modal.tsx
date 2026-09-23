import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/core/components/ui/alert-dialog";
import { Button } from "@/core/components/ui/button";

interface ConfirmModalProps {
  /** Por defecto `true`: el padre monta/desmonta el modal como en Angular. */
  open?: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isLoading?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open = true,
  title,
  message,
  confirmLabel,
  isLoading = false,
  danger = true,
  onConfirm,
  onCancel,
}: Readonly<ConfirmModalProps>) {
  // Mientras se procesa no se puede cerrar (Esc incluido): evita dobles envíos a medias.
  const handleOpenChange = (next: boolean) => {
    if (!next && !isLoading) onCancel();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="gap-0 bg-card p-6 sm:max-w-md">
        <AlertDialogTitle className="text-lg font-semibold tracking-tight">
          {title}
        </AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
          {message}
        </AlertDialogDescription>
        <div className="flex flex-col-reverse gap-2 pt-6 sm:flex-row sm:gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant={danger ? "danger" : "default"}
            size="lg"
            className="flex-1"
            onClick={onConfirm}
            loading={isLoading}
          >
            {isLoading ? "Procesando…" : confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
