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
  { value: "contenido_incorrecto", label: "Contenido incorrecto" },
  { value: "fuera_de_tema", label: "No trata del tema" },
  { value: "no_funciona", label: "No funciona" },
  { value: "diseño", label: "Diseño" },
  { value: "muy_largo", label: "Muy largo" },
  { value: "muy_corto", label: "Muy corto" },
  { value: "otro", label: "Otro" },
];
