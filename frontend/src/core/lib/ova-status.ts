import i18n from "i18next";
/** Etiqueta visible de un estado de OVA ("listo" → "Listo"; sin estado → "Borrador"). */
export function ovaStatusLabel(status: string | null | undefined): string {
  if (status === null || status === undefined || status === "") return i18n.t("shared:borrador");
  return status.charAt(0).toUpperCase() + status.slice(1);
}
