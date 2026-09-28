import type { ModelFacts } from "./model-facts";

const TOKEN_NOTE = "Precio por millón de tokens: entrada / salida.";
const IMAGE_NOTE = "Precio por imagen; «≈» es una estimación para una imagen de 1024 px.";
const VIDEO_NOTE = "Precio por segundo de video, a la resolución más barata.";

/**
 * Qué significan los precios de una lista de modelos. Las tareas Imagen y Video
 * solo ofrecen generadores, que no cobran por tokens: su nota y sus filtros son
 * otros (sin «Visión» ni «Razonamiento», que no aplican).
 */
export function optionsPricing(options: readonly { facts: ModelFacts }[]): {
  mediaOnly: boolean;
  note: string;
} {
  const kinds = options.map((option) => option.facts.generates);
  if (kinds.length === 0 || kinds.some((kind) => kind === null)) {
    return { mediaOnly: false, note: TOKEN_NOTE };
  }
  return { mediaOnly: true, note: kinds.every((kind) => kind === "video") ? VIDEO_NOTE : IMAGE_NOTE };
}
