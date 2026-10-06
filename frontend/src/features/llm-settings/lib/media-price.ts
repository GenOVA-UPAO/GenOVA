import { t } from "i18next";

/**
 * Precio de los modelos que generan imagen o video. No cobran por millón de
 * tokens de entrada y salida como los de texto, sino por imagen, por megapíxel,
 * por segundo de video o por tokens de la imagen. El backend lo reduce a
 * `media_pricing` (ver `llm/catalog/catalog_media_pricing.py`) y aquí se dice
 * en corto («$0.04/imagen», «desde $0.03/s») y entero para lectores de pantalla.
 *
 * Lógica pura: se prueba en media-price.spec.ts.
 */

export type MediaUnit = "image" | "megapixel" | "token" | "second" | "video_token";

export interface MediaPricing {
  unit: MediaUnit;
  /** USD por unidad (la variante más barata). */
  usd: number;
  /** Hay variantes más caras (resolución, calidad…). */
  from?: boolean;
  /** USD de una imagen o de un segundo de video; `null` si no se puede estimar. */
  estimate_usd?: number | null;
}

export interface MediaPrice {
  unit: MediaUnit;
  usd: number;
  from: boolean;
  estimate: number | null;
}

/** Una imagen por debajo de esto cuenta como económica (USD). */
export const CHEAP_IMAGE_MAX = 0.04;
/** Un segundo de video por debajo de esto cuenta como económico (USD). */
export const CHEAP_VIDEO_SECOND_MAX = 0.06;

const UNITS = new Set<MediaUnit>(["image", "megapixel", "token", "second", "video_token"]);

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function mediaPrice(raw: MediaPricing | null | undefined): MediaPrice | null {
  if (!raw || !UNITS.has(raw.unit)) return null;
  const usd = finite(raw.usd);
  if (usd === null) return null;
  return { unit: raw.unit, usd, from: raw.from === true, estimate: finite(raw.estimate_usd) };
}

/** «$0.035», «$0.10», «$0.0042»: tres decimales si hacen falta (0,035 no es 0,04). */
export function formatMediaUsd(value: number): string {
  if (value === 0) return "$0";
  if (value < 0.01) return `$${String(Number(value.toPrecision(2)))}`;
  const three = value.toFixed(3);
  return `$${three.endsWith("0") ? value.toFixed(2) : three}`;
}

const perMillion = (usd: number): string => formatMediaUsd(usd * 1_000_000);

/** Económico: imagen ≤ 0,04 $ o segundo de video ≤ 0,06 $. Sin estimación, no. */
export function isCheapMedia(price: MediaPrice): boolean {
  if (price.usd === 0) return true;
  if (price.estimate === null) return false;
  const video = price.unit === "second" || price.unit === "video_token";
  return price.estimate <= (video ? CHEAP_VIDEO_SECOND_MAX : CHEAP_IMAGE_MAX);
}

/** Corto, para listas: «$0.04/imagen», «desde $0.03/s», «≈$0.01/imagen». */
export function mediaPriceSummary(price: MediaPrice): string {
  if (price.usd === 0) return t("llm-settings:mediaPrice.free");
  const from = price.from ? t("llm-settings:mediaPrice.fromPrefixLower") : "";
  switch (price.unit) {
    case "image":
      return `${from}${formatMediaUsd(price.usd)}${t("llm-settings:mediaPrice.slashImage")}`;
    case "second":
      return `${from}${formatMediaUsd(price.usd)}${t("llm-settings:mediaPrice.slashSecond")}`;
    case "video_token":
      return `${from}${perMillion(price.usd)}${t("llm-settings:mediaPrice.slashMillionTokens")}`;
    default:
      // Por megapíxel o por tokens: lo útil es lo que cuesta una imagen.
      return price.estimate === null
        ? `${from}${perMillion(price.usd)}${t("llm-settings:mediaPrice.slashMillionTokens")}`
        : `≈${formatMediaUsd(price.estimate)}${t("llm-settings:mediaPrice.slashImage")}`;
  }
}

/** Entero, para lectores de pantalla y títulos. */
export function mediaPriceDescription(price: MediaPrice): string {
  if (price.usd === 0) return t("llm-settings:mediaPrice.free");
  const from = price.from ? t("llm-settings:mediaPrice.fromPrefixCapital") : "";
  switch (price.unit) {
    case "image":
      return `${from}${formatMediaUsd(price.usd)} ${t("llm-settings:mediaPrice.perImage")}`;
    case "second":
      return `${from}${formatMediaUsd(price.usd)} ${t("llm-settings:mediaPrice.perVideoSecond")}`;
    case "video_token":
      return `${from}${perMillion(price.usd)} ${t("llm-settings:mediaPrice.perVideoTokenMillion")}`;
    case "megapixel":
      return `${formatMediaUsd(price.usd)} ${t("llm-settings:mediaPrice.perMegapixel", { estimate: formatMediaUsd(price.estimate ?? price.usd) })}`;
    default:
      return price.estimate === null
        ? `${perMillion(price.usd)} ${t("llm-settings:mediaPrice.perImageTokenMillion")}`
        : t("llm-settings:mediaPrice.estimatedPerImageTokens", {
            estimate: formatMediaUsd(price.estimate),
            price: perMillion(price.usd),
          });
  }
}

/** Para ordenar por precio: lo que cuesta una imagen o un segundo; `null` si no se sabe. */
export function mediaSortPrice(price: MediaPrice): number | null {
  return price.usd === 0 ? 0 : price.estimate;
}
