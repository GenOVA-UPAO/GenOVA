"""Cloudflare Workers AI image generation → base64 data URI."""

from __future__ import annotations

import base64
import os

import httpx
import structlog

logger = structlog.get_logger(__name__)


def generate_cloudflare_image(
    prompt: str,
    api_key: str | None,
    width: int,
    height: int,
    model: str | None = None,
) -> str | None:
    """Workers AI FLUX — free tier ~10k neurons/day. ``width``/``height`` unused by CF."""
    del width, height  # API ignores custom size for this model path
    account_id = os.getenv("CF_ACCOUNT_ID", "").strip()
    if not account_id:
        logger.warning("image generation skipped: CF_ACCOUNT_ID not set", provider="cloudflare")
        return None
    token = api_key or os.getenv("CF_AI_API_KEY", "").strip()
    if not token:
        logger.warning("image generation skipped: no api_key / CF_AI_API_KEY", provider="cloudflare")
        return None
    cf_model = model or os.getenv("CF_IMAGE_MODEL", "@cf/black-forest-labs/flux-1-schnell")
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{cf_model}"
    try:
        resp = httpx.post(
            url,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"prompt": prompt, "num_steps": 4},
            timeout=60.0,
        )
        resp.raise_for_status()
        ct = resp.headers.get("content-type", "")
        if "image" in ct:
            return "data:image/png;base64," + base64.b64encode(resp.content).decode("ascii")
        data = resp.json()
        if data.get("success") and isinstance(data.get("result"), dict):
            img_bytes = data["result"].get("image")
            if img_bytes:
                return "data:image/png;base64," + img_bytes
        logger.warning(
            "image generation returned unexpected response",
            provider="cloudflare",
            response=str(data)[:200],
        )
        return None
    except Exception as exc:
        err = str(exc)
        if "401" in err:
            logger.warning(
                "image generation failed: CF_AI_API_KEY rejected (401). "
                "Create a Cloudflare API token with Workers AI Edit on this account.",
                provider="cloudflare",
                account_id=account_id[:8] + "…",
            )
        else:
            logger.warning("image generation failed", provider="cloudflare", error=err)
        return None
