"""Pollinations.ai image generation.

Free, no-key image API. Each request renders the prompt server-side and returns
a JPEG. We fetch in parallel and base64-encode so the resulting HTML stays
self-contained (SCORM packages must not depend on external URLs).
"""
import base64
import logging
import os
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor  # noqa: F401 (kept for future tier-aware use)

logger = logging.getLogger(__name__)

_BASE = "https://image.pollinations.ai/prompt/"
_TIMEOUT_S = 25
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; GenOVA/1.0; +https://genova.ai)",
    "Referer": "https://genova.ai",
    "Accept": "image/*",
}


def _build_headers() -> dict[str, str]:
    """Add Authorization if POLLINATIONS_TOKEN is set (gives higher quota)."""
    h = dict(_HEADERS)
    token = os.getenv("POLLINATIONS_TOKEN")
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def fetch_image_data_uri(
    prompt: str,
    width: int = 512,
    height: int = 512,
    model: str | None = None,
) -> str | None:
    """Render `prompt` via Pollinations and return a base64 JPEG data URI.

    Returns None on any failure — callers must handle missing images so the
    resource still renders without them. `model` defaults to Pollinations'
    anonymous-tier model; named models like `flux` may require a token.
    """
    clean = (prompt or "").strip()
    if not clean:
        return None

    params = {"width": width, "height": height, "nologo": "true"}
    if model:
        params["model"] = model
    qs = urllib.parse.urlencode(params)
    url = f"{_BASE}{urllib.parse.quote(clean)}?{qs}"
    req = urllib.request.Request(url, headers=_build_headers())
    try:
        with urllib.request.urlopen(req, timeout=_TIMEOUT_S) as resp:
            data = resp.read()
        return "data:image/jpeg;base64," + base64.b64encode(data).decode("ascii")
    except Exception as exc:
        logger.warning("Pollinations fetch failed for prompt %r: %s", clean[:60], exc)
        return None


def fetch_images_parallel(
    prompts: list[str],
    width: int = 512,
    height: int = 512,
    model: str | None = None,
) -> list[str | None]:
    """Fetch a batch of prompts. Pollinations throttles concurrent anonymous
    requests, so we limit parallelism to 2. Returns one data URI per prompt
    (None for the ones that failed)."""
    if not prompts:
        return []

    def _one(p: str) -> str | None:
        return fetch_image_data_uri(p, width=width, height=height, model=model)

    # Pollinations anonymous tier returns 402 on concurrent requests, so we
    # fetch serially. 5 images ≈ 20–30 s.
    return [_one(p) for p in prompts]
