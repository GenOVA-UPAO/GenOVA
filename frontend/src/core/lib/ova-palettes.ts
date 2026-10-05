import i18n from "i18next";
/** Una combinación de colores para los OVAs: primario (p) y acento (a). */
export interface Palette {
  name: string;
  p: string;
  a: string;
}

/**
 * Combinaciones de «Personalizado». El servidor deriva del primario y el acento
 * el resto de colores del recurso (llm/utils/palette.py).
 */
export const PALETTES: Palette[] = [
  { name: "UPAO", p: "#0A3D91", a: "#F47A20" },
  { get name() { return i18n.t("shared:oceano"); }, p: "#164E63", a: "#38BDF8" },
  { get name() { return i18n.t("shared:bosque"); }, p: "#14532D", a: "#86EFAC" },
  { get name() { return i18n.t("shared:fuego"); }, p: "#7F1D1D", a: "#FCA5A5" },
  { get name() { return i18n.t("shared:lavanda"); }, p: "#4C1D95", a: "#C4B5FD" },
  { get name() { return i18n.t("shared:cobre"); }, p: "#78350F", a: "#FCD34D" },
  { get name() { return i18n.t("shared:pizarra"); }, p: "#1E293B", a: "#94A3B8" },
  { get name() { return i18n.t("shared:rosa"); }, p: "#831843", a: "#F9A8D4" },
];

/** La paleta guardada, si es una de las que ofrece la plataforma. */
export function knownPalette(raw: unknown): Palette | null {
  if (!raw || typeof raw !== "object") return null;
  const name = (raw as { name?: unknown }).name;
  return PALETTES.find((palette) => palette.name === name) ?? null;
}
