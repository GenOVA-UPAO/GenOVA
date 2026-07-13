import { preview, type ResourcePreviewInfo } from "./preview-types";

export const EXPLAIN_PREVIEWS: Record<string, ResourcePreviewInfo> = {
  "1": preview(
    "Video Teórico",
    "Guion estructurado (y prompt) para un video explicativo.",
    "Guion + prompt de video",
    ["Explicación estructurada", "Ejemplos visuales", "Resumen al cierre"],
    "video",
  ),
  "2": preview(
    "Lectura Guiada",
    "Texto didáctico con secciones y preguntas de comprensión.",
    "HTML narrativo",
    ["Secciones claras", "Ejemplos intercalados", "Chequeo de comprensión"],
    "read",
  ),
  "3": preview(
    "Mapa Conceptual",
    "Diagrama de conceptos y relaciones clicables.",
    "HTML + CSS/JS",
    ["Conceptos enlazados", "Relaciones etiquetadas", "Detalle al seleccionar"],
    "map",
  ),
  "4": preview(
    "FAQ Interactivo",
    "Preguntas frecuentes expandibles sobre el tema.",
    "HTML acordeón",
    ["Lista de preguntas", "Respuestas al expandir", "Orden de lo básico a lo avanzado"],
    "card",
  ),
  "5": preview(
    "Demo Animada",
    "Demostración visual paso a paso del concepto.",
    "HTML + animación",
    ["Pasos animados", "Controles play/siguiente", "Nota conceptual"],
    "lab",
  ),
  "6": preview(
    "Glosario Visual",
    "Tarjetas de términos con definición e imagen/icono.",
    "HTML tipo glosario",
    ["Términos clave", "Definición breve", "Ejemplo de uso"],
    "card",
  ),
  "7": preview(
    "Línea de Tiempo",
    "Cronología del desarrollo o del proceso del concepto.",
    "HTML timeline",
    ["Eventos ordenados", "Detalle por hito", "Visión de evolución"],
    "timeline",
  ),
  "8": preview(
    "Diagrama de Framework",
    "Esquema de capas/componentes del framework o modelo.",
    "HTML diagrama",
    ["Bloques del framework", "Relaciones entre partes", "Leyenda breve"],
    "map",
  ),
  "9": preview(
    "Tabla Comparativa",
    "Tabla que contrasta enfoques, modelos o técnicas.",
    "HTML tabla",
    ["Filas/columnas claras", "Criterios de comparación", "Conclusión sugerida"],
    "card",
  ),
  "10": preview(
    "Infografía Interactiva",
    "Infografía con zonas clicables y datos clave.",
    "HTML + CSS interactivo",
    ["Bloques visuales", "Datos destacados", "Detalle al interactuar"],
    "card",
  ),
};
