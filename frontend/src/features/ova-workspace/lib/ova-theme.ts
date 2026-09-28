import { knownPalette } from "@/core/lib/ova-palettes";

import type { OvaTheme } from "./types";

const UPAO_THEME: OvaTheme = { color: "upao", design: "upao" };

/**
 * Tema inicial de un OVA nuevo a partir de «Estilo de mis OVAs» (theme_settings
 * del usuario: colorMode ai|upao|custom, designMode ai|upao, palette).
 */
export function themeFromSettings(settings: unknown): OvaTheme {
  if (!settings || typeof settings !== "object") return UPAO_THEME;
  const raw = settings as { colorMode?: unknown; designMode?: unknown; palette?: unknown };
  const palette = raw.colorMode === "custom" ? knownPalette(raw.palette) : null;
  const design = raw.designMode === "ai" ? "free" : "upao";
  if (palette) return { color: "custom", design, palette };
  return { color: raw.colorMode === "ai" ? "free" : "upao", design };
}

/** Lo que viaja al servidor: la paleta solo con «custom», con sus dos colores. */
export function themePayload(theme: OvaTheme) {
  const { color, design, palette } = theme;
  if (color === "custom" && palette) {
    return {
      color,
      design,
      palette: { name: palette.name, primary: palette.p, accent: palette.a },
    };
  }
  return { color: color === "custom" ? "upao" : color, design };
}

/** Resumen corto para la barra de «Crear OVA». */
export function themeSummary(theme: OvaTheme): string {
  if (theme.color === "custom" && theme.palette) return `Paleta ${theme.palette.name}`;
  if (theme.color === "upao" && theme.design === "upao") return "UPAO";
  if (theme.color === "free" && theme.design === "free") return "IA elige";
  return "Mixto";
}
