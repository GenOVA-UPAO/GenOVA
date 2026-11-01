import i18n from "i18next";
import { toast } from "sonner";

/**
 * Avisa del resultado de una acción por lote con lo que el backend procesó de
 * verdad, no con lo seleccionado: los omitidos (empezaron a generarse, ya
 * estaban restaurados o eliminados en otra pestaña, sin permiso…) se avisan aparte.
 */
export function toastBatchResult(successKey: string, done: number, skipped: number): void {
  if (done > 0 || skipped === 0) toast.success(i18n.t(successKey, { count: done }));
  if (skipped > 0) toast.warning(i18n.t("ova-library:skipped", { count: skipped }));
}
