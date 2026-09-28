import { toast } from "sonner";

/** Id fijo: un aviso nuevo sustituye al anterior y guardar o descartar lo cierra. */
const PENDING_CHANGES_TOAST_ID = "llm-pending-changes";

/** Aviso de un cambio que aún no se ha guardado (p. ej. «Modelo copiado…»). */
export function showPendingChangesToast(message: string): void {
  toast.success(message, { id: PENDING_CHANGES_TOAST_ID });
}

/** Tras guardar o descartar, el aviso de «Guarda los cambios» ya no tiene sentido. */
export function dismissPendingChangesToast(): void {
  toast.dismiss(PENDING_CHANGES_TOAST_ID);
}
