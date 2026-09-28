import type { TestOutcome } from "../lib/model-test";

/** Icono y color de cada tono de resultado: rojo solo para lo que hay que arreglar. */
export const TONE_STYLE: Record<TestOutcome["tone"], { icon: string; className: string }> = {
  success: { icon: "check-circle", className: "text-success-strong" },
  warning: { icon: "warning", className: "text-accent-brand" },
  error: { icon: "warning-circle", className: "text-destructive" },
};
