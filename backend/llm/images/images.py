"""Image generation via Hugging Face Inference Providers (FLUX.1-schnell).

FLUX left the serverless `hf-inference` catalog (HTTP 410). Generation now
routes through Inference Providers (default: fal-ai) using the HF token as a
proxy key — same contract as `InferenceClient(provider=..., api_key=hf_…)`.

Returns a base64 data URI so SCORM HTML stays self-contained. Returns None on
any failure so callers can render a placeholder.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
from concurrent.futures import ThreadPoolExecutor

import httpx
import structlog

logger = structlog.get_logger(__name__)

_cache: dict[str, str] = {}
_MAX_CACHE = 100
_TIMEOUT = 60.0

# Hub model id → {provider: provider_model_id}. Used when Hub mapping fetch fails.
_STATIC_PROVIDER_IDS: dict[str, dict[str, str]] = {
    "black-forest-labs/FLUX.1-schnell": {
        "fal-ai": "fal-ai/flux/schnell",
        "together": "black-forest-labs/FLUX.1-schnell",
        "replicate": "black-forest-labs/flux-schnell",
        "nscale": "black-forest-labs/FLUX.1-schnell",
        "wavespeed": "wavespeed-ai/flux-schnell",
    },
}


def _cache_key(prompt: str, w: int, h: int, model: str, provider: str) -> str:
    return hashlib.sha256(f"{prompt}:{w}:{h}:{model}:{provider}".encode()).hexdigest()


def _resolve_provider_id(hf_model: str, provider: str) -> str | None:
    """Map Hub model id → provider-native id (Hub API, then static fallback)."""
    override = os.getenv("HF_IMAGE_PROVIDER_ID", "").strip()
    if override:
        return override
    try:
        resp = httpx.get(
            f"https://huggingface.co/api/models/{hf_model}",
            params={"expand[]": "inferenceProviderMapping"},
            timeout=15.0,
        )
        resp.raise_for_status()
        mapping = resp.json().get("inferenceProviderMapping") or {}
        entry = mapping.get(provider) or {}
        pid = entry.get("providerId")
        if pid and entry.get("status") in (None, "live", "staging"):
            return pid
    except Exception as exc:
        logger.info("HF provider mapping fetch failed; using static map", error=str(exc)[:120])
    return _STATIC_PROVIDER_IDS.get(hf_model, {}).get(provider)


def fetch_image_data_uri(
    prompt: str,
    width: int = 512,
    height: int = 512,
    model: str | None = None,
    api_key: str | None = None,
) -> str | None:
    """Render `prompt` via HF Inference Providers and return a base64 data URI.

    `api_key` overrides HF_TOKEN (per-user / platform keys). Returns None if no
    key is configured or on any failure.
    """
    clean = (prompt or "").strip()
    if not clean:
        return None

    hf_token = api_key or os.getenv("HF_TOKEN", "").strip()
    if not hf_token:
        logger.warning("image generation skipped: no HF_TOKEN / api_key", provider="huggingface")
        return None

    hf_model = (model or os.getenv("HF_IMAGE_MODEL", "black-forest-labs/FLUX.1-schnell")).strip()
    provider = os.getenv("HF_IMAGE_PROVIDER", "fal-ai").strip() or "fal-ai"
    key = _cache_key(clean, width, height, hf_model, provider)
    if key in _cache:
        return _cache[key]

    provider_id = _resolve_provider_id(hf_model, provider)
    if not provider_id:
        logger.warning(
            "image generation skipped: no provider mapping",
            provider=provider,
            model=hf_model,
        )
        return None

    # HF token → router proxy. Direct fal keys use Key auth on fal.run (see falai provider).
    base = os.getenv("HF_INFERENCE_BASE", "").rstrip("/")
    url = base or f"https://router.huggingface.co/{provider}/{provider_id}"
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "prompt": clean,
        "num_inference_steps": 4,
        "image_size": {"width": width, "height": height},
    }
    try:
        logger.info(
            "attempting image generation",
            provider="huggingface",
            route=provider,
            prompt=clean[:60],
            model=hf_model,
            provider_id=provider_id,
        )
        resp = httpx.post(
            url,
            content=json.dumps(payload).encode("utf-8"),
            headers=headers,
            timeout=_TIMEOUT,
        )
        if resp.status_code == 401:
            logger.warning(
                "image generation failed: HF token rejected (401). "
                "Regenerate HF_TOKEN with Inference Providers permission.",
                provider="huggingface",
            )
            return None
        if resp.status_code == 410:
            logger.warning(
                "image generation failed: endpoint gone (410). "
                "Set HF_IMAGE_PROVIDER to a live provider (fal-ai/together/replicate).",
                provider="huggingface",
                url=url,
            )
            return None
        resp.raise_for_status()
        data = resp.content
        # fal-ai (and most providers) return JSON with an image URL.
        if data.startswith(b"{") or "json" in (resp.headers.get("content-type") or ""):
            body = resp.json()
            if body.get("error"):
                logger.warning(
                    "HF Inference Providers JSON error",
                    error=str(body.get("error"))[:200],
                )
                return None
            img_url = ((body.get("images") or [{}])[0]).get("url")
            if not img_url:
                logger.warning("HF response missing images[0].url", keys=list(body)[:8])
                return None
            img = httpx.get(img_url, timeout=_TIMEOUT, follow_redirects=True)
            img.raise_for_status()
            data = img.content
            ct = img.headers.get("content-type", "image/jpeg")
        else:
            ct = resp.headers.get("content-type", "image/jpeg")

        uri = f"data:{ct};base64," + base64.b64encode(data).decode("ascii")
        if len(_cache) >= _MAX_CACHE:
            _cache.pop(next(iter(_cache)))
        _cache[key] = uri
        return uri
    except Exception as exc:
        logger.warning(
            "image generation failed",
            provider="huggingface",
            prompt=clean[:60],
            error=str(exc),
        )
        return None


def fetch_images_parallel(
    prompts: list[str],
    width: int = 512,
    height: int = 512,
    model: str | None = None,
) -> list[str | None]:
    """Fetch a batch of prompts with limited concurrency (2 workers)."""
    if not prompts:
        return []

    def _one(p: str) -> str | None:
        return fetch_image_data_uri(p, width=width, height=height, model=model)

    with ThreadPoolExecutor(max_workers=2) as pool:
        return list(pool.map(_one, prompts))
