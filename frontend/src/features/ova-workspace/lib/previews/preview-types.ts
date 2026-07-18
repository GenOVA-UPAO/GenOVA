export interface ResourcePreviewInfo {
  label: string;
  /** What the learner receives / the deliverable. */
  returns: string;
  format: string;
  bullets: string[];
  /** Mini layout sketch key for the preview panel. */
  wire: WireframeKind;
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
  label: string,
  returns: string,
  format: string,
  bullets: [string, string, string],
  wire: WireframeKind,
): ResourcePreviewInfo {
  return { label, returns, format, bullets, wire };
}
