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

export const PHASE_COLORS: Record<string, { tab: string; badge: string }> = {
  enganche: {
    tab: "bg-primary text-primary-foreground",
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  exploracion: {
    tab: "bg-primary/85 text-primary-foreground",
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  explicacion: {
    tab: "bg-primary/70 text-primary-foreground",
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  elaboracion: {
    tab: "bg-accent-brand/85 text-primary-foreground",
    badge: "bg-accent-brand/10 text-accent-brand border-accent-brand/25",
  },
  evaluacion: {
    tab: "bg-accent-brand text-primary-foreground",
    badge: "bg-accent-brand/10 text-accent-brand border-accent-brand/25",
  },
};

const DEFAULT_TAB = "bg-muted text-muted-foreground";
const DEFAULT_BADGE = "bg-muted text-muted-foreground border-border";

export function phaseColor(phaseId: string): { tab: string; badge: string } {
  return PHASE_COLORS[phaseId] ?? { tab: DEFAULT_TAB, badge: DEFAULT_BADGE };
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
