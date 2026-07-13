/** Phosphor icon class (without `ph ` prefix) for a resource `tipo` label. */
const RESOURCE_ICON_BY_TIPO: Record<string, string> = {
  // Engage
  "Cómic Interactivo": "ph-book-open",
  "Storyboard de Video": "ph-film-strip",
  "Micro-Podcast": "ph-microphone",
  "Juego de Gamificación": "ph-game-controller",
  "Dilema Ético": "ph-scales",
  "Noticia de Impacto": "ph-newspaper",
  "Juego de Roles": "ph-users-three",
  "Timeline Interactivo": "ph-clock",
  "Escape Room Virtual": "ph-door",
  "Simulador Intuitivo": "ph-cpu",
  // Explore
  "Simulador Virtual Lab": "ph-flask",
  "Agente Socrático": "ph-chat-circle",
  "Juego Drag & Drop": "ph-puzzle-piece",
  "Video con Pausa Activa": "ph-video-camera",
  "Lectura Interactiva": "ph-book-open",
  "Simulador de Slider": "ph-sliders-horizontal",
  "Experimento Guiado": "ph-flask",
  "Mapa Mental": "ph-graph",
  "Lab de Hipótesis": "ph-flask",
  // Explain
  "Video Teórico": "ph-video-camera",
  "Lectura Guiada": "ph-book-open",
  "Mapa Conceptual": "ph-graph",
  "FAQ Interactivo": "ph-chat-circle",
  "Demo Animada": "ph-sparkle",
  "Glosario Visual": "ph-text-aa",
  "Línea de Tiempo": "ph-clock",
  "Diagrama de Framework": "ph-tree-structure",
  "Tabla Comparativa": "ph-table",
  "Infografía Interactiva": "ph-presentation-chart",
  // Elaborate
  "Estudio de Caso": "ph-clipboard-text",
  "Ejercicio Guiado": "ph-pencil-simple",
  "Mini-Proyecto": "ph-wrench",
  "Simulación Aplicada": "ph-flask",
  "Análisis de Datos": "ph-chart-line",
  "Escenario Ramificado": "ph-git-branch",
  "Lab de Código": "ph-code",
  "Mapa de Problemas": "ph-compass",
  "Juego de Estrategia": "ph-strategy",
  "Reto de Diseño": "ph-blueprint",
  // Evaluate
  "Quiz Interactivo": "ph-exam",
  "Rúbrica de Autoevaluación": "ph-clipboard-text",
  "Desafío Contrarreloj": "ph-timer",
  "Examen Opción Múltiple": "ph-list-checks",
  "Completar Espacios": "ph-text-t",
  "Relacionar Conceptos": "ph-link",
  "Crucigrama Conceptual": "ph-puzzle-piece",
  "Preguntas de Desarrollo": "ph-chat-text",
  "Simulación Evaluativa": "ph-target",
  "Diploma de Logro": "ph-trophy",
};

const KEYWORD_FALLBACKS: [RegExp, string][] = [
  [/podcast|audio|mic/i, "ph-microphone"],
  [/video|film|storyboard/i, "ph-film-strip"],
  [/cómic|comic|lectura|libro|book/i, "ph-book-open"],
  [/juego|game|gamif/i, "ph-game-controller"],
  [/quiz|examen|eval/i, "ph-exam"],
  [/lab|simul|experimento|hipótesis/i, "ph-flask"],
  [/mapa|diagrama|graph/i, "ph-graph"],
  [/código|code/i, "ph-code"],
  [/chat|agente|faq|socrát/i, "ph-chat-circle"],
  [/noticia|news/i, "ph-newspaper"],
  [/dilema|ética|ethic/i, "ph-scales"],
  [/timeline|línea|tiempo|clock/i, "ph-clock"],
  [/escape|door/i, "ph-door"],
  [/caso|rúbrica|clipboard/i, "ph-clipboard-text"],
  [/proyecto|reto|diseño/i, "ph-wrench"],
  [/datos|chart|análisis/i, "ph-chart-line"],
];

const DEFAULT_RESOURCE_ICON = "ph-squares-four";

/** Returns a Phosphor class like `ph ph-microphone` for a resource tipo. */
export function resourceIconClass(tipo: string | undefined | null): string {
  const name = (tipo || "").trim();
  if (!name) return `ph ${DEFAULT_RESOURCE_ICON}`;
  const exact = RESOURCE_ICON_BY_TIPO[name];
  if (exact) return `ph ${exact}`;
  for (const [re, icon] of KEYWORD_FALLBACKS) {
    if (re.test(name)) return `ph ${icon}`;
  }
  return `ph ${DEFAULT_RESOURCE_ICON}`;
}

export const PHASE_ICON_BY_KEY: Record<string, string> = {
  engage: "ph-target",
  explore: "ph-magnifying-glass",
  explain: "ph-lightbulb",
  elaborate: "ph-hammer",
  evaluate: "ph-check-square",
};

export function phaseIconClass(phaseKey: string): string {
  return `ph ${PHASE_ICON_BY_KEY[phaseKey] ?? "ph-circle"}`;
}
