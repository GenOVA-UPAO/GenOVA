import i18n, { type TFunction } from "i18next";

import { localizedCatalogName } from "./resource-previews";

// Nombres propios que conservan su mayúscula en medio de la frase.
const PROPER_NOUNS = new Map([["geogebra", "GeoGebra"]]);

function lowerWord(word: string): string {
  const proper = PROPER_NOUNS.get(word.toLowerCase());
  if (proper) return proper;
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
export function resourceDisplayName(name: string, t: TFunction = i18n.t): string {
  const localized = localizedCatalogName(name, t);
  if (!localized) return name;
  const [first = "", ...rest] = localized.split(" ");
  const tail = rest.map((word) => word.split("-").map(lowerWord).join("-"));
  const head = first.split("-").map((part, index) => (index === 0 ? part : lowerWord(part))).join("-");
  return [head, ...tail].join(" ");
}
