export const TASK_LABELS: Record<string, string> = {
  texto: "Texto (Generación OVA)",
  codigo: "Código (HTML)",
  orquestador: "Orquestador (Planificación)",
  razonamiento: "Razonamiento",
};

export const TASK_DESCS: Record<string, string> = {
  texto: "Redacta el contenido de los recursos educativos del OVA.",
  codigo: "Genera el HTML interactivo de cada recurso y el paquete SCORM.",
  orquestador: "Planifica el OVA y coordina a los demás modelos paso a paso.",
  razonamiento: "Resuelve evaluaciones y decisiones que requieren analizar el contenido.",
  imagen: "Genera las imágenes de los recursos del OVA.",
  video: "Genera los videos de los recursos del OVA.",
};

export const MODALITY_SYMBOLS: Record<string, string> = {
  text: "Aa",
  multimodal: "◆",
  image: "◇",
  audio: "♪",
};

export function getModalitySymbol(modality: string): string {
  return MODALITY_SYMBOLS[modality] || "Aa";
}
