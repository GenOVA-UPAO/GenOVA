export const TASK_LABELS: Record<string, string> = {
  texto: "Texto (Generación OVA)",
  codigo: "Código (HTML)",
  orquestador: "Orquestador (Planificación)",
  razonamiento: "Razonamiento",
};

export const TASK_DESCS: Record<string, string> = {
  texto: "Modelo principal utilizado para generar el contenido de los recursos educativos.",
  codigo: "Especializado en generar estructuras HTML y recursos interactivos SCORM.",
  orquestador: "Coordina los agentes secundarios para la generación paso a paso.",
  razonamiento: "Se utiliza para evaluaciones complejas o toma de decisiones semánticas.",
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
