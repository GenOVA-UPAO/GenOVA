import { preview, type ResourcePreviewInfo } from "./preview-types";

export const ENGAGE_PREVIEWS: Record<string, ResourcePreviewInfo> = {
  "1": preview(
    "Cómic Interactivo",
    "Página HTML con viñetas clicables y una pregunta final.",
    "HTML + CSS interactivo",
    ["3–5 paneles secuenciales", "Narración del concepto", "Pregunta de reflexión al cierre"],
    "comic",
  ),
  "2": preview(
    "Storyboard de Video",
    "Guion visual por escenas + prompt listo para generar video.",
    "Guion + prompt de video",
    ["Escenas con indicaciones", "Diálogos por escena", "Prompt copiable de video"],
    "storyboard",
  ),
  "3": preview(
    "Micro-Podcast",
    "Audio corto (o guion) que introduce el tema en tono conversacional.",
    "Audio / guion narrado",
    ["Hook de apertura", "Explicación breve", "Cierre con pregunta"],
    "audio",
  ),
  "4": preview(
    "Juego de Gamificación",
    "Mini-juego HTML con puntos o retos sobre el concepto.",
    "HTML + JS interactivo",
    ["Meta clara del juego", "Feedback al acertar/fallar", "Puntuación o progreso"],
    "game",
  ),
  "5": preview(
    "Dilema Ético",
    "Escenario con opciones de decisión y consecuencias.",
    "HTML narrativo + elección",
    ["Situación conflictiva", "2–3 opciones de acción", "Reflexión según la elección"],
    "decisions",
  ),
  "6": preview(
    "Noticia de Impacto",
    "Artículo estilo noticia que contextualiza el tema en el mundo real.",
    "HTML tipo artículo",
    ["Titular impactante", "Cuerpo de la noticia", "Conexión con el concepto"],
    "read",
  ),
  "7": preview(
    "Juego de Roles",
    "Escenario donde el estudiante asume un rol y responde.",
    "HTML + decisiones",
    ["Rol asignado", "Situación a resolver", "Retroalimentación del rol"],
    "decisions",
  ),
  "8": preview(
    "Timeline Interactivo",
    "Línea de tiempo clicable con hitos del concepto.",
    "HTML + CSS interactivo",
    ["Hitos ordenados", "Detalle al seleccionar", "Visión global del proceso"],
    "timeline",
  ),
  "9": preview(
    "Escape Room Virtual",
    "Retos encadenados para “escapar” aplicando el concepto.",
    "HTML + JS interactivo",
    ["Pistas y acertijos", "Progreso por salas", "Desbloqueo final"],
    "decisions",
  ),
  "10": preview(
    "Simulador Intuitivo",
    "Controles simples para experimentar el concepto sin fórmulas.",
    "HTML + JS interactivo",
    ["Controles ajustables", "Resultado visual inmediato", "Insight guiado"],
    "lab",
  ),
};
