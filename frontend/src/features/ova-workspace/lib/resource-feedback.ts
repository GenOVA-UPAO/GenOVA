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
export const FEEDBACK_REASONS: readonly { value: FeedbackReason; label: string; labelKey: string }[] = [
  { value: "contenido_incorrecto", labelKey: "workspace:contenido_incorrecto", get label() { return i18n.t(this.labelKey); } },
  { value: "fuera_de_tema", labelKey: "workspace:no_trata_del_tema", get label() { return i18n.t(this.labelKey); } },
  { value: "no_funciona", labelKey: "workspace:no_funciona", get label() { return i18n.t(this.labelKey); } },
  { value: "diseño", labelKey: "workspace:diseno", get label() { return i18n.t(this.labelKey); } },
  { value: "muy_largo", labelKey: "workspace:muy_largo", get label() { return i18n.t(this.labelKey); } },
  { value: "muy_corto", labelKey: "workspace:muy_corto", get label() { return i18n.t(this.labelKey); } },
  { value: "otro", labelKey: "workspace:otro", get label() { return i18n.t(this.labelKey); } },
];
