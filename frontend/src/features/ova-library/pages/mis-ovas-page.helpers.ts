import i18n from "i18next";
export const STATUS_OPTIONS = [
  {
    get label() {
      return i18n.t("ova-library:todos_los_estados");
    },
    value: "all",
  },
  {
    get label() {
      return i18n.t("ova-library:borrador");
    },
    value: "borrador",
  },
  {
    get label() {
      return i18n.t("ova-library:generando");
    },
    value: "generando",
  },
  {
    get label() {
      return i18n.t("ova-library:listo");
    },
    value: "listo",
  },
  {
    get label() {
      return i18n.t("ova-library:error");
    },
    value: "error",
  },
] as const;

/** Valor del filtro a partir del parámetro `?estado=` (cualquier otro valor → "all"). */
export function statusFromParam(value: string | null): string {
  const match = STATUS_OPTIONS.find((opt) => opt.value === value);
  return match ? match.value : "all";
}

/** Etiqueta visible de un valor del filtro de estado. */
export function statusLabel(value: string): string {
  return STATUS_OPTIONS.find((opt) => opt.value === value)?.label ?? value;
}
