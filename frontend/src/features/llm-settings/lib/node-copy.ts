/**
 * Nombres y descripciones de los nodos del motor para la pestaña Plataforma.
 * El backend los envía en jerga interna («re-genera con feedback si score
 * bajo», «data URIs») y con los nombres en inglés de las fases; aquí se dicen
 * en el idioma de un docente. Un nodo nuevo sin entrada usa el texto del backend.
 */
export const NODE_COPY: Partial<Record<string, { name: string; description: string }>> = {
  concierge: {
    name: "Planificador",
    description: "Lee la descripción del docente y decide qué recursos generar en cada fase.",
  },
  engage: { name: "Fase de enganche", description: "Genera los recursos de la fase 1 del modelo 5E." },
  explore: { name: "Fase de exploración", description: "Genera los recursos de la fase 2." },
  explain: { name: "Fase de explicación", description: "Genera los recursos de la fase 3." },
  elaborate: { name: "Fase de elaboración", description: "Genera los recursos de la fase 4." },
  evaluate: { name: "Fase de evaluación", description: "Genera los recursos de la fase 5." },
  critic: {
    name: "Crítico pedagógico",
    description: "Evalúa la calidad pedagógica de cada recurso y pide rehacerlo si no llega al mínimo.",
  },
  editor: {
    name: "Editor de coherencia 5E",
    description: "Revisa que la terminología y la progresión entre fases sean coherentes.",
  },
  assemble: {
    name: "Ensamblador",
    description: "Une los recursos y genera el paquete SCORM.",
  },
  images: {
    name: "Generador de imágenes",
    description: "Crea las imágenes de los recursos de enganche y las incluye dentro del SCORM.",
  },
  video: {
    name: "Generador de video",
    description: "Crea los videos de los recursos. Sin clave API, entrega un guion para grabarlo.",
  },
  refine: {
    name: "Refinador estructural",
    description: "Detecta y corrige fallos de HTML y JavaScript en cada recurso.",
  },
};

export function withNodeCopy<T extends { id: string; name: string; description?: string }>(node: T): T {
  const copy = NODE_COPY[node.id];
  return copy ? { ...node, ...copy } : node;
}
