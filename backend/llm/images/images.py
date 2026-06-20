"""Image generation via Hugging Face Inference API (FLUX.1-schnell by default).

Returns a base64 JPEG data URI so the resulting HTML stays self-contained
(SCORM packages must not depend on external URLs). Returns None on any failure
so the caller can render a placeholder instead.
"""

import base64
import hashlib
import logging
import os
from concurrent.futures import ThreadPoolExecutor

import httpx

logger = logging.getLogger(__name__)

# Simple in-memory cache: prompt hash → data_uri. Avoids re-fetching the same
# images during regeneration or retry flows.
_cache: dict[str, str] = {}
_MAX_CACHE = 100


def _cache_key(prompt: str, w: int, h: int) -> str:
    return hashlib.sha256(f"{prompt}:{w}:{h}".encode()).hexdigest()


def fetch_image_data_uri(
    prompt: str,
    width: int = 512,
    height: int = 512,
    model: str | None = None,
    api_key: str | None = None,
) -> str | None:
    """Render `prompt` using Hugging Face Inference API and return a base64 JPEG data URI.

    `api_key` overrides HF_TOKEN env var (for per-user keys). Returns None if
    no key is configured or on any failure.
    """
    import json

    clean = (prompt or "").strip()
    if not clean:
        return None

    key = _cache_key(clean, width, height)
    if key in _cache:
        return _cache[key]

    hf_token = api_key or os.getenv("HF_TOKEN", "").strip()
    if not hf_token:
        return None

    hf_model = os.getenv("HF_IMAGE_MODEL", "black-forest-labs/FLUX.1-schnell").strip()
    # HF retired the legacy serverless host (api-inference.huggingface.co — no
    # longer resolves, hence "No address associated with hostname") in favour of
    # the Inference Providers router. hf-inference keeps the same
    # POST {"inputs": prompt} → image-bytes contract. Base is env-overridable so a
    # third-party provider route (fal-ai, replicate…) can be swapped in later.
    base = os.getenv(
        "HF_INFERENCE_BASE", "https://router.huggingface.co/hf-inference/models"
    ).rstrip("/")
    url = f"{base}/{hf_model}"
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json",
        "x-wait-for-model": "true",
    }
    try:
        logger.info(
            "Attempting Hugging Face image generation for prompt %r using model %s",
            clean[:60],
            hf_model,
        )
        resp = httpx.post(
            url,
            content=json.dumps({"inputs": clean}).encode("utf-8"),
            headers=headers,
            timeout=30.0,
            verify=True,
        )
        resp.raise_for_status()
        data = resp.content
        if data.startswith(b"{") and b"error" in data:
            logger.warning(
                "HF Inference API returned JSON error: %s",
                data.decode("utf-8", errors="ignore")[:200],
            )
            return None

        uri = "data:image/jpeg;base64," + base64.b64encode(data).decode("ascii")
        if len(_cache) >= _MAX_CACHE:
            _cache.pop(next(iter(_cache)))
        _cache[key] = uri
        return uri
    except Exception as exc:
        logger.warning("Hugging Face image generation failed for %r: %s", clean[:60], exc)
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
