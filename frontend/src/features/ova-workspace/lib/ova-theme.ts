import i18n, { type TFunction } from "i18next";

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
export function themeSummary(theme: OvaTheme, t: TFunction = i18n.t): string {
  if (theme.color === "custom" && theme.palette) return t("workspace:paleta_value", { p0: theme.palette.name });
  if (theme.color === "upao" && theme.design === "upao") return "UPAO";
  if (theme.color === "free" && theme.design === "free") return t("workspace:ia_elige");
  return t("workspace:mixto");
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Texto (oscuro o blanco) con más contraste WCAG sobre `hex`: los acentos claros (lavanda, menta) llevan texto oscuro. */
export function readableTextOn(hex: string): "#15233B" | "#FFFFFF" {
  const lum = luminance(hex);
  const onWhite = 1.05 / (lum + 0.05);
  const onDark = (lum + 0.05) / (luminance("#15233B") + 0.05);
  return onDark >= onWhite ? "#15233B" : "#FFFFFF";
}
