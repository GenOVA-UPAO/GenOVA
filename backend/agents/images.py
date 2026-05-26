"""Pollinations.ai image generation.

Free, no-key image API. Each request renders the prompt server-side and returns
a JPEG. We fetch with limited concurrency and base64-encode so the resulting
HTML stays self-contained (SCORM packages must not depend on external URLs).
"""
import base64
import hashlib
import logging
import os
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

_BASE = "https://image.pollinations.ai/prompt/"
_TIMEOUT_S = 15  # Lowered from 25s — placeholder is better than long waits.
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; GenOVA/1.0; +https://genova.ai)",
    "Referer": "https://genova.ai",
    "Accept": "image/*",
}

# Simple in-memory cache: prompt hash → data_uri. Avoids re-fetching the same
# images during regeneration or retry flows.
_cache: dict[str, str] = {}
_MAX_CACHE = 100


def _build_headers() -> dict[str, str]:
    """Add Authorization if POLLINATIONS_TOKEN is set (gives higher quota)."""
    h = dict(_HEADERS)
    token = os.getenv("POLLINATIONS_TOKEN")
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def _cache_key(prompt: str, w: int, h: int) -> str:
    return hashlib.sha256(f"{prompt}:{w}:{h}".encode()).hexdigest()


def fetch_image_data_uri(
    prompt: str,
    width: int = 512,
    height: int = 512,
    model: str | None = None,
) -> str | None:
    """Render `prompt` using Hugging Face Inference API (if HF_TOKEN is configured)
    with fallback to Pollinations.ai, and return a base64 JPEG data URI.

    Returns None on any failure so the caller can render a placeholder/fallback.
    """
    import json

    clean = (prompt or "").strip()
    if not clean:
        return None

    key = _cache_key(clean, width, height)
    if key in _cache:
        return _cache[key]

    hf_token = os.getenv("HF_TOKEN", "").strip()
    if hf_token:
        # Option 1: Hugging Face Inference API (FLUX.1-schnell)
        hf_model = os.getenv("HF_IMAGE_MODEL", "black-forest-labs/FLUX.1-schnell").strip()
        url = f"https://api-inference.huggingface.co/models/{hf_model}"
        headers = {
            "Authorization": f"Bearer {hf_token}",
            "Content-Type": "application/json",
            "x-wait-for-model": "true"
        }
        payload = json.dumps({"inputs": clean}).encode("utf-8")
        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")  # noqa: S310
        try:
            logger.info("Attempting Hugging Face image generation for prompt %r using model %s", clean[:60], hf_model)
            with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
                data = resp.read()
            if data.startswith(b"{") and b"error" in data:
                logger.warning("HF Inference API returned JSON error: %s", data.decode("utf-8", errors="ignore")[:200])
                raise RuntimeError("HF Inference API returned error")

            uri = "data:image/jpeg;base64," + base64.b64encode(data).decode("ascii")
            if len(_cache) >= _MAX_CACHE:
                _cache.pop(next(iter(_cache)))
            _cache[key] = uri
            return uri
        except Exception as exc:
            logger.warning("Hugging Face image generation failed for %r, falling back to Pollinations: %s", clean[:60], exc)

    # Option 2 / Fallback: Pollinations.ai
    params = {"width": width, "height": height, "nologo": "true"}
    if model:
        params["model"] = model
    qs = urllib.parse.urlencode(params)
    url = f"{_BASE}{urllib.parse.quote(clean)}?{qs}"
    req = urllib.request.Request(url, headers=_build_headers())  # noqa: S310
    try:
        logger.info("Attempting Pollinations image generation for prompt %r", clean[:60])
        with urllib.request.urlopen(req, timeout=_TIMEOUT_S) as resp:  # noqa: S310
            data = resp.read()
        uri = "data:image/jpeg;base64," + base64.b64encode(data).decode("ascii")
        if len(_cache) >= _MAX_CACHE:
            _cache.pop(next(iter(_cache)))
        _cache[key] = uri
        return uri
    except Exception as exc:
        logger.warning("Pollinations fetch failed for prompt %r: %s", clean[:60], exc)
        return None


def fetch_images_parallel(
    prompts: list[str],
    width: int = 512,
    height: int = 512,
    model: str | None = None,
) -> list[str | None]:
    """Fetch a batch of prompts with limited concurrency (2 workers).

    Returns one data URI per prompt (None for the ones that failed).
    """
    if not prompts:
        return []

    def _one(p: str) -> str | None:
        return fetch_image_data_uri(p, width=width, height=height, model=model)

    with ThreadPoolExecutor(max_workers=2) as pool:
        return list(pool.map(_one, prompts))
