import type { ResourceBlock, VisualElement, VisualSpec } from "./visual-editor.types";

const BLOCK_TYPE_MAP: Record<string, string> = {
  "upao-header": "Header",
  header: "Header",
  "upao-example": "Example",
  example: "Example",
  "upao-question": "Question",
  question: "Question",
  "upao-summary": "Summary",
  summary: "Summary",
  "upao-comic-panel": "ComicPanel",
  panel: "ComicPanel",
  "upao-card": "Card",
  card: "Card",
  "upao-steps": "Steps",
  steps: "Steps",
  "upao-reveal": "Reveal",
  reveal: "Reveal",
};

function mapBlockType(tipo: string): string {
  return BLOCK_TYPE_MAP[tipo] ?? "Paragraph";
}

export function buildInitialSpec(data: ResourceBlock[]): VisualSpec {
  const elements: Record<string, VisualElement | undefined> = {
    root: {
      type: "Stack",
      props: { direction: "vertical", gap: "md" },
      children: data.map((b) => b.id.replace(/[^a-zA-Z0-9_-]/g, "_")),
    },
  };

  for (const b of data) {
    const id = b.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    elements[id] = {
      type: mapBlockType(b.tipo),
      props: b.props,
      children: [],
    };
  }

  return { root: "root", elements };
}
