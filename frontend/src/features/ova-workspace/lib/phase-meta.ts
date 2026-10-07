import i18n, { type TFunction } from "i18next";
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

const PRIMARY_BADGE = "bg-primary/10 text-primary border-primary/20";
const ACCENT_BADGE = "bg-accent-brand/10 text-accent-brand border-accent-brand/25";

const META: Record<string, PhaseMeta> = {
  engage: {
    label: "workspace:enganche",
    tab: "bg-primary text-primary-foreground",
    badge: PRIMARY_BADGE,
  },
  explore: {
    label: "workspace:exploracion",
    tab: "bg-primary/85 text-primary-foreground",
    badge: PRIMARY_BADGE,
  },
  explain: {
    label: "workspace:explicacion",
    tab: "bg-primary/70 text-primary-foreground",
    badge: PRIMARY_BADGE,
  },
  elaborate: {
    label: "workspace:elaboracion",
    tab: "bg-accent-brand/85 text-primary-foreground",
    badge: ACCENT_BADGE,
  },
  evaluate: {
    label: "workspace:evaluacion",
    tab: "bg-accent-brand text-primary-foreground",
    badge: ACCENT_BADGE,
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
export function phaseMeta(key: string, t: TFunction = i18n.t): PhaseMeta {
  const canonicalKey = ALIASES[key] ?? key;
  return Object.hasOwn(META, canonicalKey)
    ? { ...META[canonicalKey], label: t(META[canonicalKey].label) }
    : { ...DEFAULT_PHASE_META, label: key };
}
