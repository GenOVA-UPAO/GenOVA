import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/core/components/ui/alert-dialog";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

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
  /** Si se indica, el usuario debe escribirla (sin distinguir mayúsculas) para habilitar la acción. */
  confirmPhrase?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open = true,
  title,
  message,
  confirmLabel,
  isLoading = false,
  loadingLabel,
  danger = true,
  confirmPhrase,
  onConfirm,
  onCancel,
}: Readonly<ConfirmModalProps>) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState("");
  const inputId = useId();
  const phraseOk =
    confirmPhrase === undefined || typed.trim().toLowerCase() === confirmPhrase.toLowerCase();

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
        {confirmPhrase !== undefined && (
          <form
            className="mt-4 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (phraseOk && !isLoading) onConfirm();
            }}
          >
            <Label htmlFor={inputId} className="leading-snug font-normal">
              {t("shared:para_confirmar_escribe")} <strong className="font-semibold">{confirmPhrase}</strong>
            </Label>
            <Input
              id={inputId}
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
              }}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={isLoading}
              placeholder={confirmPhrase}
            />
          </form>
        )}
        <div className="flex flex-col-reverse gap-2 pt-6 sm:flex-row sm:gap-3">
          {/* AlertDialogCancel: Radix le da el foco inicial (con un Button normal
          el foco se quedaba detrás del modal). Cierra vía onOpenChange → onCancel. */}
          {/* `flex-1` solo en fila: en columna (móvil) su base 0 aplastaba los botones
          a ~22 px de alto. En móvil, altura táctil de 44 px. */}
          <AlertDialogCancel size="lg" className="max-sm:h-11 sm:flex-1" disabled={isLoading}>
            {t("shared:cancelar")} </AlertDialogCancel>
          <Button
            variant={danger ? "danger" : "default"}
            size="lg"
            className="max-sm:h-11 sm:flex-1"
            onClick={onConfirm}
            disabled={!phraseOk}
            loading={isLoading}
          >
            {isLoading ? (loadingLabel ?? t("shared:procesando")) : confirmLabel}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
