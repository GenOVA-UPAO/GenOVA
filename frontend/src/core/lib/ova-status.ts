import type { TFunction } from "i18next";
import i18n from "i18next";
const STATUS_KEYS: Partial<Record<string, string>> = {
  borrador: "shared:borrador",
  generando: "shared:status.generating",
  listo: "shared:status.ready",
  error: "shared:status.error",
};
/** Etiqueta visible de un estado de OVA ("listo" → "Listo"; sin estado → "Borrador"). */
export function ovaStatusLabel(status: string | null | undefined, t: TFunction = i18n.t): string {
  if (status === null || status === undefined || status === "") return t("shared:borrador");
  const key = STATUS_KEYS[status];
  if (key) return t(key);
  return status.charAt(0).toUpperCase() + status.slice(1);
}
