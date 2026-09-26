"""Precio legible de los modelos de imagen y video de OpenRouter.

Los modelos de chat cobran por token de entrada y salida; los de imagen y video
no. OpenRouter los publica así:

- Imagen (`/images/models/{id}/endpoints` → `pricing`): una lista de SKUs
  `{billable, unit, cost_usd, variant?}` con `unit` = `image`, `megapixel` o
  `token` (tokens de la imagen generada, como GPT Image o Gemini).
- Video (`/videos/models` → `pricing_skus`): un diccionario con claves libres por
  proveedor («duration_seconds_720p», «cents_per_second_output»,
  «video_tokens»…) y el precio como cadena.

Aquí se reduce todo a una forma común que el frontend pinta igual para
cualquier modelo (`media_pricing`):

    {"unit": "image" | "megapixel" | "token" | "second" | "video_token",
     "usd": 0.035,            # USD por unidad (la variante más barata)
     "from": False,           # True si hay variantes más caras (resolución…)
     "estimate_usd": 0.035}   # USD de UNA imagen o UN segundo de video;
                              # None si no se puede estimar con honestidad

y una cadena corta para los listados que ya usan `pricing` («$0.035/imagen»,
«desde $0.03/s»).
"""

from __future__ import annotations

import re

# Tokens de salida de una imagen de 1024×1024 (Gemini cobra 1290; GPT Image
# «medium», 1056). Solo sirve para estimar el coste de una imagen.
IMAGE_OUTPUT_TOKENS_ESTIMATE = 1290
# Megapíxeles de una imagen «estándar» (1024×1024 ≈ 1,05 MP).
IMAGE_MEGAPIXELS_ESTIMATE = 1.0

_UNIT_LABEL = {
    "image": "imagen",
    "megapixel": "megapíxel",
    "second": "s",
}

# SKUs de video que NO son el precio de generar un segundo a partir de texto.
_VIDEO_SKIP = (
    "input",
    "reference",
    "continuation",
    "minimum",
    "image",
    "megapixel",
    "with_video_input",
)
_RESOLUTION_SUFFIX = re.compile(r"_(\d{3,4}p|\dk)$", re.IGNORECASE)


def _num(value) -> float | None:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return None
    return v if v >= 0 else None


def format_usd(value: float) -> str:
    """«$0.035», «$0.10», «$0.0042»: sin perder los precios muy bajos."""
    if value == 0:
        return "$0"
    if value < 0.01:
        return f"${float(f'{value:.2g}'):g}"
    text = f"{value:.3f}".rstrip("0")
    if len(text.split(".")[1]) < 2:
        text = f"{value:.2f}"
    return f"${text}"


def _label(pricing: dict) -> str:
    usd, unit = pricing["usd"], pricing["unit"]
    if usd == 0:
        return "Gratuito"
    prefix = "desde " if pricing.get("from") else ""
    if unit == "token":
        return f"{prefix}{format_usd(usd * 1_000_000)}/1M tokens de imagen"
    if unit == "video_token":
        return f"{prefix}{format_usd(usd * 1_000_000)}/1M tokens de video"
    return f"{prefix}{format_usd(usd)}/{_UNIT_LABEL.get(unit, unit)}"


def _image_estimate(unit: str, usd: float) -> float | None:
    if unit == "image":
        return usd
    if unit == "megapixel":
        return round(usd * IMAGE_MEGAPIXELS_ESTIMATE, 6)
    if unit == "token":
        return round(usd * IMAGE_OUTPUT_TOKENS_ESTIMATE, 6)
    return None


def image_media_pricing(endpoints: list[dict] | None) -> dict | None:
    """Precio por imagen generada del endpoint más barato (o None)."""
    best: dict | None = None
    for endpoint in endpoints or []:
        outputs = [
            (sku.get("unit"), _num(sku.get("cost_usd")), bool(sku.get("variant")))
            for sku in endpoint.get("pricing") or []
            if isinstance(sku, dict) and sku.get("billable") == "output_image"
        ]
        outputs = [(u, c, v) for u, c, v in outputs if u and c is not None]
        if not outputs:
            continue
        unit, usd, _ = min(outputs, key=lambda o: (o[2], o[1]))
        candidate = {
            "unit": unit,
            "usd": usd,
            "from": len({c for u, c, _ in outputs if u == unit}) > 1,
            "estimate_usd": _image_estimate(unit, usd),
        }
        best_cost = (best or {}).get("estimate_usd")
        cost = candidate["estimate_usd"]
        if best is None or (cost is not None and (best_cost is None or cost < best_cost)):
            best = candidate
    return best


def _video_sku(key: str, raw) -> tuple[str, float, str | None] | None:
    """(unidad, USD por unidad, resolución) de un SKU de video, o None."""
    # La documentación los escribe con guiones («per-video-second-1080p»); el
    # listado real, con guiones bajos («duration_seconds_1080p»).
    key = key.lower().replace("-", "_")
    if any(word in key for word in _VIDEO_SKIP):
        return None
    value = _num(raw)
    if value is None:
        return None
    match = _RESOLUTION_SUFFIX.search(key)
    resolution = match.group(1).lower() if match else None
    if key.startswith("cents_") and "second" in key:
        return "second", value / 100, resolution
    if "duration_seconds" in key:
        return "second", value, resolution
    if key.startswith("video_tokens"):
        return "video_token", value, resolution
    if key.startswith("per_") and "second" in key:
        return "second", value, resolution
    return None


def video_skus(pricing_skus: dict | None) -> list[tuple[str, float, str | None, bool]]:
    """SKUs útiles: (unidad, USD, resolución, con_audio)."""
    out = []
    for key, raw in (pricing_skus or {}).items():
        parsed = _video_sku(str(key), raw)
        if parsed:
            out.append((*parsed, "with_audio" in str(key).lower().replace("-", "_")))
    # Si hay precio sin audio, el de «con audio» sobra: GenOVA no lo pide.
    if any(not audio for *_rest, audio in out):
        out = [sku for sku in out if not sku[3]]
    return out


def video_media_pricing(
    pricing_skus: dict | None, resolutions: list | None = None
) -> dict | None:
    """Precio por segundo de video más barato (o None si no se entiende).

    Con `resolutions` (las que admite el modelo) se ignoran los SKUs de otras:
    algunos modelos publican precio para 480p aunque ya no la sirven.
    """
    skus = video_skus(pricing_skus)
    allowed = {str(r).lower() for r in resolutions or []}
    if allowed:
        skus = [sku for sku in skus if sku[2] is None or sku[2] in allowed] or skus
    if not skus:
        return None
    per_second = [sku for sku in skus if sku[0] == "second"]
    pool = per_second or skus
    unit = pool[0][0]
    usd = min(sku[1] for sku in pool)
    return {
        "unit": unit,
        "usd": usd,
        "from": len({sku[1] for sku in pool}) > 1,
        "estimate_usd": usd if unit == "second" else None,
    }


def video_price_per_second(pricing_skus: dict | None, resolution: str | None) -> float | None:
    """USD por segundo a `resolution` (o el más barato si no hay precio para ella)."""
    per_second = [sku for sku in video_skus(pricing_skus) if sku[0] == "second"]
    if not per_second:
        return None
    exact = [sku[1] for sku in per_second if resolution and sku[2] == resolution.lower()]
    generic = [sku[1] for sku in per_second if sku[2] is None]
    return min(exact or generic or [sku[1] for sku in per_second])


def pricing_label(media_pricing: dict | None) -> str | None:
    """Cadena corta para `pricing` («$0.04/imagen», «desde $0.03/s»)."""
    return _label(media_pricing) if media_pricing else None
