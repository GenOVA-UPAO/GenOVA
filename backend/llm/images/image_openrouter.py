"""OpenRouter Image API (POST /api/v1/images) → base64 data URI."""

from __future__ import annotations

import os

import httpx
import structlog

from core import openrouter

logger = structlog.get_logger(__name__)

_TIMEOUT = 90.0
_DEFAULT_MODEL = "openai/gpt-image-1-mini"

# Closest common ratios accepted by Gemini / most image endpoints.
_RATIOS: tuple[tuple[str, float], ...] = (
    ("1:1", 1.0),
    ("4:3", 4 / 3),
    ("3:4", 3 / 4),
    ("3:2", 3 / 2),
    ("2:3", 2 / 3),
    ("16:9", 16 / 9),
    ("9:16", 9 / 16),
    ("5:4", 5 / 4),
    ("4:5", 4 / 5),
    ("21:9", 21 / 9),
)


def _ratio_value(label: str) -> float | None:
    left, _, right = str(label).partition(":")
    try:
        return float(left) / float(right)
    except (TypeError, ValueError, ZeroDivisionError):
        return None


def _aspect_ratio(width: int, height: int, allowed: list | None = None) -> str | None:
    """Relación de aspecto más parecida a w/h entre las que admite el modelo.

    `allowed` viene del catálogo (`media.aspect_ratios`): [] = el modelo no
    acepta el parámetro (mandarlo da 400); None = no se sabe (se usa la lista
    común, que admiten casi todos).
    """
    target = width / height if width > 0 and height > 0 else 1.0
    if allowed is None:
        candidates = list(_RATIOS)
    else:
        candidates = [(a, v) for a in allowed if (v := _ratio_value(a)) is not None]
        if not candidates:
            return None
    return min(candidates, key=lambda r: abs(r[1] - target))[0]


def _allowed_ratios(model: str) -> list | None:
    from llm.images.media_models import media_params

    params = media_params("openrouter", model)
    ratios = params.get("aspect_ratios")
    if not params or not isinstance(ratios, list):
        return None
    return ratios


class ImageRequestError(Exception):
    """La petición de imagen falló; `status` es el HTTP (None si no hubo respuesta)."""

    def __init__(self, status: int | None, detail: str, *, timed_out: bool = False):
        super().__init__(detail)
        self.status = status
        # Mismo nombre que en los SDK: así lo clasifica model_probe.
        self.status_code = status
        self.timed_out = timed_out


def _headers(api_key: str) -> dict:
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": os.getenv("APP_URL", "https://genova.app"),
        "X-Title": "GenOVA",
    }


def _post(url: str, api_key: str, payload: dict) -> dict:
    try:
        resp = httpx.post(url, headers=_headers(api_key), json=payload, timeout=_TIMEOUT)
    except httpx.TimeoutException as exc:
        raise ImageRequestError(None, "timeout", timed_out=True) from exc
    except httpx.HTTPError as exc:
        raise ImageRequestError(None, f"{type(exc).__name__}") from None
    if resp.status_code >= 400:
        raise ImageRequestError(resp.status_code, (resp.text or "")[:240].replace("\n", " "))
    return resp.json()


def _via_images(prompt: str, api_key: str, model: str, width: int, height: int) -> str:
    """POST /api/v1/images (modelos solo de imagen: FLUX, Recraft, Seedream…)."""
    payload: dict = {"model": model, "prompt": prompt, "n": 1}
    ratio = _aspect_ratio(width, height, _allowed_ratios(model))
    if ratio:
        payload["aspect_ratio"] = ratio
    data = _post(openrouter.api_url("images"), api_key, payload).get("data") or []
    b64 = (data[0] if data else {}).get("b64_json")
    if not b64:
        raise ImageRequestError(200, "la respuesta no trae imagen")
    if b64.startswith("data:"):
        return b64
    # Los modelos vectoriales (Recraft *-vector) devuelven SVG: va dentro de
    # un <img>, donde un SVG no ejecuta scripts, así que vale igual.
    return f"data:{data[0].get('media_type') or 'image/png'};base64,{b64}"


def _via_chat(prompt: str, api_key: str, model: str, width: int, height: int) -> str:
    """Chat completions con `modalities: [image, text]` (Gemini Image, GPT Image).

    Cobra por tokens (~$0,04 una imagen de Gemini Flash) y funciona aunque
    /images rechace la petición por el coste máximo que reserva.
    """
    payload: dict = {
        "model": model,
        "modalities": ["image", "text"],
        "messages": [{"role": "user", "content": prompt}],
        # Una imagen de Gemini Flash son ~1300 tokens: el tope evita respuestas largas.
        "max_tokens": 4096,
    }
    ratio = _aspect_ratio(width, height, None)
    if ratio:
        payload["image_config"] = {"aspect_ratio": ratio}
    choices = _post(openrouter.api_url("chat/completions"), api_key, payload).get("choices") or []
    images = ((choices[0].get("message") or {}).get("images") or []) if choices else []
    url = ((images[0] if images else {}).get("image_url") or {}).get("url")
    if not url:
        raise ImageRequestError(200, "la respuesta no trae imagen")
    return url


def request_openrouter_image(
    prompt: str, api_key: str, width: int, height: int, model: str | None = None
) -> str:
    """Una imagen de OpenRouter como data URI; lanza ImageRequestError si falla."""
    from llm.images.media_models import generates_via_chat

    mid = (model or os.getenv("OPENROUTER_IMAGE_MODEL", _DEFAULT_MODEL)).strip() or _DEFAULT_MODEL
    route = _via_chat if generates_via_chat("openrouter", mid) else _via_images
    return route(prompt, api_key, mid, width, height)


def generate_openrouter_image(
    prompt: str,
    api_key: str | None,
    width: int,
    height: int,
    model: str | None = None,
) -> str | None:
    """Generate one image via OpenRouter; return data URI or None.

    Payload stays minimal: many models (e.g. Gemini Flash Image) reject ``size`` /
    ``output_format`` with HTTP 400. We only send ``aspect_ratio`` derived from w/h,
    and only one the model accepts (from the catalog), or none if it takes none.
    """
    if not api_key:
        logger.warning("image generation skipped: no api_key", provider="openrouter")
        return None
    try:
        return request_openrouter_image(prompt, api_key, width, height, model)
    except ImageRequestError as exc:
        logger.warning(
            "image generation failed",
            provider="openrouter",
            model=model,
            status=exc.status,
            body=str(exc)[:240],
        )
        return None
