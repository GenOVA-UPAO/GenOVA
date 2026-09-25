"""Modelos de generación de imagen y video de OpenRouter en el catálogo.

`GET /api/v1/models` solo trae los modelos de chat. Los de imagen y video tienen
sus propios listados, públicos (sin clave):

- `GET /api/v1/images/models`: id, nombre, descripción, parámetros admitidos y
  la ruta de sus endpoints; el precio vive en
  `GET /api/v1/images/models/{id}/endpoints` (uno por modelo, se piden en
  paralelo y, si alguno falla, el modelo queda con el precio desconocido).
- `GET /api/v1/videos/models`: id, nombre, descripción, duraciones,
  resoluciones y relaciones de aspecto admitidas, y `pricing_skus`.

El resultado crudo se guarda en la caché de catálogo (fila `openrouter_media`)
como el resto de proveedores, y de él salen filas del catálogo completo con
aptitud `imagen` o `video`. Un modelo que necesita una imagen o un video de
entrada (editar, escalar, avatares) sigue en el catálogo pero sin aptitud: en
una tarea que genera desde texto fallaría.
"""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

import httpx
import structlog

from core import openrouter
from llm.catalog.catalog_media_pricing import (
    image_media_pricing,
    pricing_label,
    video_media_pricing,
)

logger = structlog.get_logger(__name__)

_TIMEOUT_S = 10.0
_ENDPOINT_WORKERS = 8

CACHE_KEY = "openrouter_media"

# Recomendados: baratos y buenos para ilustrar un recurso educativo.
RECOMMENDED_IMAGE = frozenset(
    {
        "openai/gpt-image-1-mini",
        "google/gemini-2.5-flash-image",
        "google/gemini-3.1-flash-lite-image",
        "bytedance-seed/seedream-4.5",
        "black-forest-labs/flux.2-klein-4b",
        "recraft/recraft-v4.1-flash",
    }
)
RECOMMENDED_VIDEO = frozenset(
    {"google/veo-3.1-lite", "alibaba/wan-3.0", "x-ai/grok-imagine-video"}
)


def _get_json(url: str) -> dict | None:
    try:
        resp = httpx.get(url, timeout=_TIMEOUT_S)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        logger.warning(
            "media model list fetch failed",
            provider="openrouter",
            url=url,
            error_type=type(exc).__name__,
        )
        return None
    return data if isinstance(data, dict) else None


def _endpoints(model: dict) -> list[dict] | None:
    """Endpoints (con su precio) de un modelo de imagen; None si no se pudo pedir."""
    path = model.get("endpoints") or f"/api/v1/images/models/{model.get('id')}/endpoints"
    data = _get_json(path if path.startswith("http") else f"{openrouter.origin()}{path}")
    if data is None:
        return None
    endpoints = data.get("endpoints")
    return endpoints if isinstance(endpoints, list) else []


def _with_endpoints(images: list[dict]) -> list[dict]:
    with ThreadPoolExecutor(max_workers=_ENDPOINT_WORKERS) as pool:
        endpoints = list(pool.map(_endpoints, images))
    return [{**m, "_endpoints": eps} for m, eps in zip(images, endpoints, strict=True)]


def fetch_openrouter_media() -> dict | None:
    """Listados de imagen y video de OpenRouter, o None si no respondió ninguno.

    `{"images": [...] | None, "videos": [...] | None}`: None en una clave quiere
    decir que ese listado falló (se conserva el anterior).
    """
    images_raw = _get_json(openrouter.api_url("images/models"))
    videos_raw = _get_json(openrouter.api_url("videos/models"))
    if images_raw is None and videos_raw is None:
        return None
    images = [m for m in (images_raw or {}).get("data") or [] if isinstance(m, dict) and m.get("id")]
    videos = [m for m in (videos_raw or {}).get("data") or [] if isinstance(m, dict) and m.get("id")]
    result = {
        "images": _with_endpoints(images) if images_raw is not None else None,
        "videos": videos if videos_raw is not None else None,
    }
    logger.info(
        "media model lists fetched",
        provider="openrouter",
        images=len(result["images"] or []),
        videos=len(result["videos"] or []),
    )
    return result


def load_cached_media(db) -> dict | None:
    """Listados crudos desde la caché de catálogo (None si no hay o no valen)."""
    if db is None:
        return None
    try:
        from llm.catalog.catalog_cache import load_from_cache

        raw = load_from_cache(db, CACHE_KEY)
    except Exception:
        logger.exception("catalog cache read failed", provider=CACHE_KEY)
        return None
    if not isinstance(raw, dict):
        return None
    if not isinstance(raw.get("images"), list) and not isinstance(raw.get("videos"), list):
        return None
    return raw


def save_media_cache(db, raw: dict) -> None:
    """Guarda los listados recién pedidos (solo si llegaron los dos)."""
    if db is None or raw.get("images") is None or raw.get("videos") is None:
        return
    from llm.catalog.catalog_cache import save_to_cache

    save_to_cache(db, CACHE_KEY, raw)


# ── Filas del catálogo ─────────────────────────────────────────────────────────


def _enum_values(params: dict, name: str) -> list:
    spec = (params or {}).get(name)
    if isinstance(spec, dict) and isinstance(spec.get("values"), list):
        return list(spec["values"])
    return []


def _needs_input_image(params: dict) -> bool:
    refs = (params or {}).get("input_references")
    try:
        return isinstance(refs, dict) and int(refs.get("min") or 0) >= 1
    except (TypeError, ValueError):
        return False


def _row(model: dict, *, kind: str, media: dict, media_pricing: dict | None, apt: bool) -> dict:
    category = "imagen" if kind == "image" else "video"
    recommended = RECOMMENDED_IMAGE if kind == "image" else RECOMMENDED_VIDEO
    return {
        "provider": "openrouter",
        "model_id": model["id"],
        "label": model.get("name") or model["id"],
        "description": (model.get("description") or "").strip()[:200],
        "category": category,
        "modality": f"text->{kind}",
        "pricing": pricing_label(media_pricing),
        "pricing_detail": None,
        "media_pricing": media_pricing,
        "media": {"kind": kind, **media},
        "context_length": None,
        "curated": model["id"] in recommended,
        "active": True,
        "task": None,
        "aptitudes": [category] if apt else [],
    }


def _image_row(model: dict) -> dict | None:
    endpoints = model.get("_endpoints")
    if endpoints == []:
        # Ningún proveedor lo sirve ahora mismo: elegirlo fallaría siempre.
        return None
    params = model.get("supported_parameters") or {}
    if endpoints:
        params = endpoints[0].get("supported_parameters") or params
    media = {
        "aspect_ratios": _enum_values(params, "aspect_ratio"),
        "requires_input": _needs_input_image(params),
    }
    return _row(
        model,
        kind="image",
        media=media,
        media_pricing=image_media_pricing(endpoints),
        apt=not media["requires_input"],
    )


def _video_row(model: dict) -> dict:
    durations = sorted({int(d) for d in model.get("supported_durations") or [] if _is_int(d)})
    media = {
        "durations": durations,
        "resolutions": list(model.get("supported_resolutions") or []),
        "aspect_ratios": list(model.get("supported_aspect_ratios") or []),
        "audio": bool(model.get("generate_audio")),
        # Sin duraciones no genera desde texto: edita, escala o anima un avatar.
        "requires_input": not durations,
        "pricing_skus": dict(model.get("pricing_skus") or {}),
    }
    return _row(
        model,
        kind="video",
        media=media,
        media_pricing=video_media_pricing(model.get("pricing_skus"), media["resolutions"]),
        apt=bool(durations),
    )


def _is_int(value) -> bool:
    try:
        int(value)
    except (TypeError, ValueError):
        return False
    return True


def build_media_entries(raw: dict | None) -> dict[str, list[dict] | None]:
    """{"image": filas | None, "video": filas | None} (None = listado sin datos)."""
    raw = raw or {}
    images, videos = raw.get("images"), raw.get("videos")
    return {
        "image": None
        if images is None
        else [r for r in (_image_row(m) for m in images if m.get("id")) if r],
        "video": None if videos is None else [_video_row(m) for m in videos if m.get("id")],
    }


def merge_media_entries(full: list[dict], media_rows: list[dict]) -> list[dict]:
    """Añade las filas de media al catálogo completo.

    Algunos modelos están en los dos listados (Gemini Image, GPT-5 Image): la
    fila de media manda (categoría y precio por imagen), pero conserva las
    aptitudes y el contexto de la de chat.
    """
    index = {(e["provider"], e["model_id"]): i for i, e in enumerate(full)}
    out = list(full)
    for row in media_rows:
        key = (row["provider"], row["model_id"])
        if key not in index:
            out.append(row)
            continue
        chat = out[index[key]]
        aptitudes = list(row["aptitudes"])
        aptitudes += [a for a in chat.get("aptitudes") or [] if a not in aptitudes]
        via_chat = _outputs_image(chat.get("modality"))
        out[index[key]] = {
            **row,
            **_chat_image_pricing(row, chat, via_chat),
            # También genera imagen por chat: esa vía cobra por tokens y funciona
            # cuando /images no (OpenRouter reserva allí un coste máximo alto).
            "via_chat": via_chat,
            "aptitudes": aptitudes,
            "context_length": chat.get("context_length"),
            "curated": row["curated"] or chat.get("curated", False),
        }
    return out


def _chat_image_pricing(row: dict, chat: dict, via_chat: bool) -> dict:
    """Precio por imagen de la vía de chat, que es la que se usa para estos modelos.

    El listado de /images da otra tarifa (Gemini 2.5 Flash Image: $15/1M frente a
    los $30/1M de `image_output` en chat): se estimaba ~$0,019 y se cobraban $0,039.
    """
    usd_per_m = ((chat.get("pricing_detail") or {}).get("image_output")) if via_chat else None
    if not usd_per_m:
        return {}
    usd = usd_per_m / 1_000_000
    pricing = {"unit": "token", "usd": usd, "from": False, "estimate_usd": _image_estimate(usd)}
    return {"media_pricing": pricing, "pricing": pricing_label(pricing)}


def _image_estimate(usd_per_token: float) -> float:
    from llm.catalog.catalog_media_pricing import IMAGE_OUTPUT_TOKENS_ESTIMATE

    return round(usd_per_token * IMAGE_OUTPUT_TOKENS_ESTIMATE, 6)


def _outputs_image(modality: str | None) -> bool:
    """«text+image->text+image» → True: el modelo devuelve imágenes por chat."""
    return "image" in str(modality or "").rsplit("->", 1)[-1]


def media_rows_of(full: list[dict], kind: str) -> list[dict]:
    """Filas de media de un tipo ya presentes en el catálogo (para conservarlas)."""
    return [e for e in full if (e.get("media") or {}).get("kind") == kind]
