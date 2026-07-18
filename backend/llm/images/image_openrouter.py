"""OpenRouter Image API (POST /api/v1/images) → base64 data URI."""

from __future__ import annotations

import os

import httpx
import structlog

logger = structlog.get_logger(__name__)

_TIMEOUT = 90.0
_DEFAULT_MODEL = "openai/gpt-image-1-mini"


def generate_openrouter_image(
    prompt: str,
    api_key: str | None,
    width: int,
    height: int,
    model: str | None = None,
) -> str | None:
    """Generate one image via OpenRouter; return data URI or None."""
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
        "size": f"{width}x{height}",
        "output_format": "jpeg",
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
        if resp.status_code == 402:
            logger.warning(
                "image generation failed: OpenRouter credits exhausted (402)",
                provider="openrouter",
                model=mid,
            )
            return None
        resp.raise_for_status()
        data = resp.json().get("data") or []
        if not data:
            logger.warning("image generation returned empty data", provider="openrouter")
            return None
        item = data[0]
        b64 = item.get("b64_json")
        if not b64:
            logger.warning("image generation missing b64_json", provider="openrouter")
            return None
        ct = item.get("media_type") or "image/jpeg"
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
