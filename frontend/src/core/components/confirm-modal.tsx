import {
  AlertDialog,
  AlertDialogCancel,
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
  /** Texto del botón mientras se procesa («Eliminando…»). */
  loadingLabel?: string;
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
  loadingLabel = "Procesando…",
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
          {/* AlertDialogCancel: Radix le da el foco inicial (con un Button normal
          el foco se quedaba detrás del modal). Cierra vía onOpenChange → onCancel. */}
          {/* `flex-1` solo en fila: en columna (móvil) su base 0 aplastaba los botones
          a ~22 px de alto. En móvil, altura táctil de 44 px. */}
          <AlertDialogCancel size="lg" className="max-sm:h-11 sm:flex-1" disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <Button
            variant={danger ? "danger" : "default"}
            size="lg"
            className="max-sm:h-11 sm:flex-1"
            onClick={onConfirm}
            loading={isLoading}
          >
            {isLoading ? loadingLabel : confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
