"""OpenRouter Image API (POST /api/v1/images) → base64 data URI."""

from __future__ import annotations

import os

import httpx
import structlog

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


def _aspect_ratio(width: int, height: int) -> str:
    if width <= 0 or height <= 0:
        return "1:1"
    target = width / height
    return min(_RATIOS, key=lambda r: abs(r[1] - target))[0]


def generate_openrouter_image(
    prompt: str,
    api_key: str | None,
    width: int,
    height: int,
    model: str | None = None,
) -> str | None:
    """Generate one image via OpenRouter; return data URI or None.

    Payload stays minimal: many models (e.g. Gemini Flash Image) reject ``size`` /
    ``output_format`` with HTTP 400. We only send ``aspect_ratio`` derived from w/h.
    """
    if not api_key:
        logger.warning("image generation skipped: no api_key", provider="openrouter")
        return None
    mid = (model or os.getenv("OPENROUTER_IMAGE_MODEL", _DEFAULT_MODEL)).strip()
    if not mid:
        mid = _DEFAULT_MODEL
    payload: dict = {
        "model": mid,
        "prompt": prompt,
        "n": 1,
        "aspect_ratio": _aspect_ratio(width, height),
    }
    try:
        resp = httpx.post(
            "https://openrouter.ai/api/v1/images",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": os.getenv("APP_URL", "https://genova.app"),
                "X-Title": "GenOVA",
            },
            json=payload,
            timeout=_TIMEOUT,
        )
        if resp.status_code >= 400:
            body = (resp.text or "")[:240].replace("\n", " ")
            logger.warning(
                "image generation failed",
                provider="openrouter",
                model=mid,
                status=resp.status_code,
                body=body,
            )
            return None
        data = resp.json().get("data") or []
        if not data:
            logger.warning("image generation returned empty data", provider="openrouter")
            return None
        item = data[0]
        b64 = item.get("b64_json")
        if not b64:
            logger.warning("image generation missing b64_json", provider="openrouter")
            return None
        ct = item.get("media_type") or "image/png"
        if "svg" in ct:
            return None
        if b64.startswith("data:"):
            return b64
        return f"data:{ct};base64,{b64}"
    except Exception as exc:
        logger.warning(
            "image generation failed",
            provider="openrouter",
            model=mid,
            error=str(exc)[:200],
        )
        return None
