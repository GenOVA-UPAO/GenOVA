import { preview, type ResourcePreviewInfo } from "./preview-types";

export const EXPLORE_PREVIEWS: Record<string, ResourcePreviewInfo> = {
  "1": preview(
    "Simulador Virtual Lab",
    "Laboratorio HTML donde se manipulan variables y se observan resultados.",
    "HTML + JS interactivo",
    ["Variables controlables", "Registro de resultados", "Análisis guiado"],
    "lab",
  ),
  "2": preview(
    "Agente Socrático",
    "Chat que guía con preguntas (no da la respuesta directa).",
    "HTML + JS chat",
    ["Diálogo mayéutico", "Preguntas guía", "Retroalimentación contextual"],
    "chat",
  ),
  "3": preview(
    "Juego Drag & Drop",
    "Actividad de arrastrar elementos a categorías correctas.",
    "HTML + JS interactivo",
    ["Piezas arrastrables", "Zonas de destino", "Feedback al soltar"],
    "dragdrop",
  ),
  "4": preview(
    "Video con Pausa Activa",
    "Guion/video con pausas para responder preguntas.",
    "Guion + prompt / HTML",
    ["Segmentos de video", "Pregunta en la pausa", "Continúa tras responder"],
    "storyboard",
  ),
  "5": preview(
    "Lectura Interactiva",
    "Texto con hotspots o revelaciones al hacer clic.",
    "HTML interactivo",
    ["Pasajes clave", "Notas al expandir", "Comprobación breve"],
    "read",
  ),
  "6": preview(
    "Simulador de Slider",
    "Sliders que cambian un modelo o gráfico en vivo.",
    "HTML + JS interactivo",
    ["Uno o más sliders", "Visualización dinámica", "Conclusión guiada"],
    "lab",
  ),
  "7": preview(
    "Experimento Guiado",
    "Pasos de experimento con observación y registro.",
    "HTML guiado",
    ["Pasos numerados", "Espacio de observación", "Conclusión del ensayo"],
    "lab",
  ),
  "8": preview(
    "Juego de Roles",
    "Simulación de roles para explorar el concepto en contexto.",
    "HTML + decisiones",
    ["Contexto del rol", "Decisiones del estudiante", "Debrief del rol"],
    "decisions",
  ),
  "9": preview(
    "Mapa Mental",
    "Mapa de nodos expandible alrededor del concepto central.",
    "HTML + CSS/JS",
    ["Nodo central", "Ramas clicables", "Detalle por nodo"],
    "matching",
  ),
  "10": preview(
    "Lab de Hipótesis",
    "Formulario para plantear hipótesis y contrastarlas.",
    "HTML + JS",
    ["Plantea hipótesis", "Prueba / evidencia", "Validación o rechazo"],
    "lab",
  ),
};
