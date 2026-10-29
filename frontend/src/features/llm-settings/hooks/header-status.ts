import type { TFunction } from "i18next";

/** Favoritos: salen primero al elegir modelo. Sin ninguno no hay nada que decir. */
export function favoritesLabel(count: number, t: TFunction): string {
  return count === 0 ? "" : t("llm-settings:overview.favorites", { count });
}

/**
 * «1 de 8 proveedores conectados (1 sin verificar) · 2 modelos favoritos».
 * «Sin verificar» cuenta como conectado: tiene clave y funciona, solo falta probarla.
 */
export function headerStatusText(
  count: { connected: number; total: number; unverified?: number },
  favorites: string,
  t: TFunction,
): string {
  const { connected, total, unverified = 0 } = count;
  if (total === 0) return favorites;
  const base = t(unverified > 0 ? "llm-settings:overview.connectedUnverified" : "llm-settings:overview.connected", {
    count: total,
    connected,
    total,
    unverified,
  });
  return favorites ? `${base}${t("llm-settings:overview.overviewSeparator")}${favorites}` : base;
}
