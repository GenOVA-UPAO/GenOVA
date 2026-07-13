import { preview, type ResourcePreviewInfo } from "./preview-types";

export const EVALUATE_PREVIEWS: Record<string, ResourcePreviewInfo> = {
  "1": preview(
    "Quiz Interactivo",
    "Cuestionario con feedback inmediato y puntuación.",
    "HTML + JS interactivo",
    ["Preguntas cortas", "Retroalimentación inmediata", "Resumen de puntaje"],
    "quiz",
  ),
  "2": preview(
    "Rúbrica de Autoevaluación",
    "Rúbrica para que el estudiante se autoevalúe.",
    "HTML formulario",
    ["Criterios claros", "Niveles de logro", "Reflexión final"],
    "form",
  ),
  "3": preview(
    "Desafío Contrarreloj",
    "Reto cronometrado de aplicación del concepto.",
    "HTML + timer",
    ["Temporizador", "Ítems a resolver", "Resultado al acabar"],
    "quiz",
  ),
  "4": preview(
    "Examen Opción Múltiple",
    "Examen tipo test con una respuesta correcta.",
    "HTML + JS",
    ["Ítems de opción múltiple", "Selección única", "Corrección al enviar"],
    "quiz",
  ),
  "5": preview(
    "Completar Espacios",
    "Texto con huecos para completar términos clave.",
    "HTML + inputs",
    ["Oraciones con huecos", "Validación de respuestas", "Pista opcional"],
    "form",
  ),
  "6": preview(
    "Relacionar Conceptos",
    "Emparejar términos con definiciones o ejemplos.",
    "HTML + matching",
    ["Columnas a relacionar", "Emparejamiento", "Feedback de aciertos"],
    "game",
  ),
  "7": preview(
    "Crucigrama Conceptual",
    "Crucigrama con pistas del vocabulario del tema.",
    "HTML + JS",
    ["Cuadrícula", "Pistas por número", "Validación de palabras"],
    "game",
  ),
  "8": preview(
    "Preguntas de Desarrollo",
    "Preguntas abiertas con guía de respuesta esperada.",
    "HTML + textarea",
    ["Enunciados abiertos", "Espacio de respuesta", "Criterios de evaluación"],
    "form",
  ),
  "9": preview(
    "Simulación Evaluativa",
    "Escenario simulado que evalúa decisiones del estudiante.",
    "HTML + JS",
    ["Escenario de prueba", "Decisiones evaluadas", "Puntaje / debrief"],
    "lab",
  ),
  "10": preview(
    "Diploma de Logro",
    "Página de cierre con logros y mensaje de completitud.",
    "HTML certificado",
    ["Resumen de logros", "Mensaje motivacional", "Sello / diploma visual"],
    "card",
  ),
};
