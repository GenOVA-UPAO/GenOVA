import i18n from "i18next";
export type FeedbackRating = "up" | "down";

export type FeedbackReason =
  | "contenido_incorrecto"
  | "fuera_de_tema"
  | "diseño"
  | "no_funciona"
  | "muy_largo"
  | "muy_corto"
  | "otro";

export const COMMENT_MAX = 500;

/** Motivos del 👎, en el orden en que se muestran (los más frecuentes primero). */
export const FEEDBACK_REASONS: readonly { value: FeedbackReason; label: string }[] = [
  { value: "contenido_incorrecto", get label() { return i18n.t("workspace:contenido_incorrecto"); } },
  { value: "fuera_de_tema", get label() { return i18n.t("workspace:no_trata_del_tema"); } },
  { value: "no_funciona", get label() { return i18n.t("workspace:no_funciona"); } },
  { value: "diseño", get label() { return i18n.t("workspace:diseno"); } },
  { value: "muy_largo", get label() { return i18n.t("workspace:muy_largo"); } },
  { value: "muy_corto", get label() { return i18n.t("workspace:muy_corto"); } },
  { value: "otro", get label() { return i18n.t("workspace:otro"); } },
];
