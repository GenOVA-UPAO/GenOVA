/**
 * Metadatos canónicos de las fases 5E (label + clases de tab/badge).
 * Fuente única: antes existían dos copias con las mismas clases — PHASE_META
 * (claves en inglés, workspace-html-preview) y PHASE_COLORS/PHASE_LABELS
 * (claves en español, ova-five-e-viewer). El lookup acepta ambos alias.
 */

export interface PhaseMeta {
  label: string;
  tab: string;
  badge: string;
}

const META: Record<string, PhaseMeta> = {
  engage: {
    label: "Enganche",
    tab: "bg-primary text-primary-foreground",
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  explore: {
    label: "Exploración",
    tab: "bg-primary/85 text-primary-foreground",
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  explain: {
    label: "Explicación",
    tab: "bg-primary/70 text-primary-foreground",
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  elaborate: {
    label: "Elaboración",
    tab: "bg-accent-brand/85 text-primary-foreground",
    badge: "bg-accent-brand/10 text-accent-brand border-accent-brand/25",
  },
  evaluate: {
    label: "Evaluación",
    tab: "bg-accent-brand text-primary-foreground",
    badge: "bg-accent-brand/10 text-accent-brand border-accent-brand/25",
  },
};

/** Alias aceptados por fase: inglés (phase_type del backend) y español (ids del viewer). */
const ALIASES: Record<string, string> = {
  enganche: "engage",
  exploracion: "explore",
  explicacion: "explain",
  elaboracion: "elaborate",
  evaluacion: "evaluate",
};

export const DEFAULT_PHASE_META: PhaseMeta = {
  label: "",
  tab: "bg-muted text-muted-foreground",
  badge: "bg-muted text-muted-foreground border-border",
};

/** Metadatos de una fase por clave en inglés o español; fallback neutro con la clave como label. */
export function phaseMeta(key: string): PhaseMeta {
  const canonical = META[key] ?? META[ALIASES[key]];
  return canonical ?? { ...DEFAULT_PHASE_META, label: key };
}
