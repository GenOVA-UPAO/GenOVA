import { catalogResourceNames } from "./resource-previews";

const CATALOG = catalogResourceNames();

function lowerWord(word: string): string {
  // Siglas (FAQ) se quedan como están; el resto en minúscula, también tras guion.
  if (word.length > 1 && word === word.toUpperCase()) return word;
  return word.toLowerCase();
}

/**
 * Nombre de un tipo de recurso en mayúscula de oración («Cómic interactivo»).
 * El backend usa estos nombres en Title Case como identificadores; aquí solo se
 * cambia cómo se leen. Solo se tocan los nombres del catálogo: un título propio
 * («Ley de Ohm en circuitos») se deja tal cual para no romper nombres propios.
 */
export function resourceDisplayName(name: string): string {
  if (!CATALOG.has(name)) return name;
  const [first = "", ...rest] = name.split(" ");
  const tail = rest.map((word) => word.split("-").map(lowerWord).join("-"));
  const head = first.split("-").map((part, index) => (index === 0 ? part : lowerWord(part))).join("-");
  return [head, ...tail].join(" ");
}
