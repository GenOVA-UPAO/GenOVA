import i18n, { type TFunction } from "i18next";

export interface ResourcePreviewInfo {
  /** Identificador estable y nombre original del catálogo de la API. */
  labelKey: string;
  canonicalLabel: string;
  label: string;
  /** What the learner receives / the deliverable. */
  returns: string;
  format: string;
  bullets: string[];
  /** Mini layout sketch key for the preview panel. */
  wire: WireframeKind;
  localized: (t: TFunction) => ResourcePreviewInfo;
}

/** UI-family sketches aligned with generated SCORM HTML layouts. */
export type WireframeKind =
  | "comic"
  | "storyboard"
  | "audio"
  | "chat"
  | "decisions"
  | "lab"
  | "dashboard"
  | "code"
  | "demo"
  | "quiz"
  | "read"
  | "graph"
  | "matching"
  | "cardGrid"
  | "dragdrop"
  | "crossword"
  | "game"
  | "timeline"
  | "form"
  | "steps"
  | "accordion"
  | "table"
  | "diploma"
  | "infographic";

export const ALL_WIREFRAME_KINDS: readonly WireframeKind[] = [
  "comic",
  "storyboard",
  "audio",
  "chat",
  "decisions",
  "lab",
  "dashboard",
  "code",
  "demo",
  "quiz",
  "read",
  "graph",
  "matching",
  "cardGrid",
  "dragdrop",
  "crossword",
  "game",
  "timeline",
  "form",
  "steps",
  "accordion",
  "table",
  "diploma",
  "infographic",
] as const;

export function preview(
  ...[label, returns, format, bullets, wire]: [string, string, string, [string, string, string], WireframeKind]
): ResourcePreviewInfo {
  const namespace = "workspace:";
  const translate = (key: string) => key.startsWith(namespace) ? i18n.t(key) : key;
  return {
    labelKey: label,
    get canonicalLabel() { return label.startsWith(namespace) ? i18n.t(label, { lng: "es" }) : label; },
    get label() { return translate(label); },
    get returns() { return translate(returns); },
    get format() { return translate(format); },
    get bullets() { return bullets.map(translate); },
    wire,
    localized(t) {
      const translate = (key: string) => key.startsWith(namespace) ? t(key) : key;
      return { ...this, label: translate(label), returns: translate(returns), format: translate(format), bullets: bullets.map(translate) };
    },
  };
}
