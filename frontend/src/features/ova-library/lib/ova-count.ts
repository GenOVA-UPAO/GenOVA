/** Sustantivo OVA/OVAs según cantidad. */
export function ovaNoun(count: number): string {
  return count === 1 ? "OVA" : "OVAs";
}

/** Frase "N OVA(s) + acuerdo" para toasts y confirmaciones. */
export function ovaCountPhrase(count: number, singular: string, plural: string): string {
  const verb = count === 1 ? singular : plural;
  return `${String(count)} ${ovaNoun(count)} ${verb}`;
}
