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
  ENGAGE: "Enganche",
  EXPLORE: "Exploración",
  EXPLAIN: "Explicación",
  ELABORATE: "Elaboración",
  EVALUATE: "Evaluación",
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
    title: `Modelo 5E — ${label}`,
    phases: [
      {
        id,
        order: 1,
        label,
        sections: [
          { type: "heading", content: `Fase ${label}` },
          {
            type: "paragraph",
            content:
              "Vista previa estructurada del recurso generado. El contenido final se renderiza como HTML interactivo tras la generación con IA.",
          },
          {
            type: "list",
            ordered: true,
            items: [
              "Selecciona un tipo de recurso",
              "Define el concepto de ML",
              "Genera y revisa la vista previa",
            ],
          },
        ],
      },
    ],
  };
}
