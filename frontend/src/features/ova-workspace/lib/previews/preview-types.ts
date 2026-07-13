export interface ResourcePreviewInfo {
  label: string;
  /** What the learner receives / the deliverable. */
  returns: string;
  format: string;
  bullets: string[];
  /** Mini layout sketch key for the preview panel. */
  wire: WireframeKind;
}

export type WireframeKind =
  | "comic"
  | "video"
  | "audio"
  | "chat"
  | "lab"
  | "quiz"
  | "read"
  | "map"
  | "game"
  | "timeline"
  | "form"
  | "card";

export function preview(
  label: string,
  returns: string,
  format: string,
  bullets: [string, string, string],
  wire: WireframeKind,
): ResourcePreviewInfo {
  return { label, returns, format, bullets, wire };
}
