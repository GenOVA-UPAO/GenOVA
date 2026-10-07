import i18n from "i18next";

import { phaseMeta } from "../../lib/phase-meta";

export interface PhaseSection {
  type: string;
  content?: string;
  items?: string[];
  ordered?: boolean;
  language?: string;
  src?: string;
  alt?: string;
}

export interface Phase {
  id: string;
  order: number;
  label: string;
  sections?: PhaseSection[];
}

export interface OvaContent {
  title?: string;
  phases?: Phase[];
}

// Colores canónicos por fase: lib/phase-meta.ts (acepta claves en español).
export function phaseColor(phaseId: string): { tab: string; badge: string } {
  const meta = phaseMeta(phaseId);
  return { tab: meta.tab, badge: meta.badge };
}

const PHASE_LABELS: Record<string, string> = {
  get ENGAGE() { return i18n.t("workspace:enganche"); },
  get EXPLORE() { return i18n.t("workspace:exploracion"); },
  get EXPLAIN() { return i18n.t("workspace:explicacion"); },
  get ELABORATE() { return i18n.t("workspace:elaboracion"); },
  get EVALUATE() { return i18n.t("workspace:evaluacion"); },
};

const PHASE_IDS: Record<string, string> = {
  ENGAGE: "enganche",
  EXPLORE: "exploracion",
  EXPLAIN: "explicacion",
  ELABORATE: "elaboracion",
  EVALUATE: "evaluacion",
};

export function buildPhaseDemoContent(phaseName: string): OvaContent {
  const id = PHASE_IDS[phaseName] ?? "enganche";
  const label = PHASE_LABELS[phaseName] ?? phaseName;
  return {
    title: i18n.t("workspace:modelo_5e_value", { p0: label }),
    phases: [
      {
        id,
        order: 1,
        label,
        sections: [
          { type: "heading", content: i18n.t("workspace:fase_value", { p0: label }) },
          {
            type: "paragraph",
            content:
              i18n.t("workspace:structuredPreviewHint"),
          },
          {
            type: "list",
            ordered: true,
            items: [
              i18n.t("workspace:selecciona_un_tipo_de_recurso"),
              i18n.t("workspace:define_el_concepto"),
              i18n.t("workspace:genera_y_revisa_la_vista_previa"),
            ],
          },
        ],
      },
    ],
  };
}
