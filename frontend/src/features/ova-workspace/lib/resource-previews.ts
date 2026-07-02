export interface ResourcePreviewInfo {
  label: string;
  format: string;
  bullets: string[];
}

type PreviewMap = Record<string, ResourcePreviewInfo>;

const PREVIEWS: PreviewMap = {
  "engage:1": {
    label: "Cómic Interactivo",
    format: "HTML + CSS interactivo",
    bullets: [
      "3–5 paneles secuenciales",
      "Narración contextualizada",
      "Pregunta de reflexión al cierre",
    ],
  },
  "engage:2": {
    label: "Storyboard de Video",
    format: "Guion visual + prompt",
    bullets: [
      "Escenas con indicaciones visuales",
      "Diálogos por escena",
      "Prompt para generación de video",
    ],
  },
  "explore:1": {
    label: "Simulador Virtual Lab",
    format: "HTML + JS interactivo",
    bullets: ["Variables controlables", "Registro de resultados", "Análisis guiado"],
  },
  "explore:2": {
    label: "Agente Socrático",
    format: "HTML + JS chat",
    bullets: ["Diálogo mayéutico", "Preguntas guía", "Retroalimentación contextual"],
  },
  "explain:1": {
    label: "Video Teórico",
    format: "Guion + prompt de video",
    bullets: ["Explicación estructurada", "Ejemplos visuales", "Resumen al cierre"],
  },
  "elaborate:1": {
    label: "Estudio de Caso",
    format: "HTML narrativo",
    bullets: ["Situación real", "Análisis guiado", "Propuesta de solución"],
  },
  "evaluate:1": {
    label: "Quiz Interactivo",
    format: "HTML + JS interactivo",
    bullets: ["Retroalimentación inmediata", "Puntuación acumulativa", "Resumen final"],
  },
};

export function getResourcePreview(
  phaseKey: string,
  resourceId: string | number,
): ResourcePreviewInfo | null {
  return PREVIEWS[`${phaseKey}:${resourceId}`] ?? null;
}
