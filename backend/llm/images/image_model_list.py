"""Fetch or return the available image models per provider.

SiliconFlow: dynamic via /v1/models (OpenAI-compat).
Runware / fal.ai: curated lists (their APIs don't offer simple REST model listing).
"""

import logging

import httpx

logger = logging.getLogger(__name__)

_SF_BASE = "https://api.siliconflow.cn/v1"
_SF_TIMEOUT = 10.0

# Keywords that identify image-generation models in SiliconFlow's model list
_SF_IMAGE_KEYWORDS = frozenset([
    "stable-diffusion", "flux", "kolors", "wanx", "cogview",
    "dall-e", "imagen", "sdxl", "deepfloyd", "playground",
])

RUNWARE_MODELS = [
    {"id": "runware:100@1",  "label": "FLUX.1 Schnell (fast)"},
    {"id": "runware:101@1",  "label": "FLUX.1 Dev"},
    {"id": "runware:97@1",   "label": "Stable Diffusion 3.5 Large"},
    {"id": "runware:98@1",   "label": "Stable Diffusion 3.5 Medium"},
    {"id": "runware:5@1",    "label": "SDXL 1.0"},
]

FALAI_MODELS = [
    {"id": "fal-ai/flux/schnell",       "label": "FLUX.1 Schnell (fast)"},
    {"id": "fal-ai/flux/dev",           "label": "FLUX.1 Dev"},
    {"id": "fal-ai/flux-pro",           "label": "FLUX Pro"},
    {"id": "fal-ai/flux-pro/v1.1",      "label": "FLUX Pro v1.1"},
    {"id": "fal-ai/stable-diffusion-v3-medium", "label": "Stable Diffusion 3 Medium"},
    {"id": "fal-ai/aura-flow",          "label": "AuraFlow"},
    {"id": "fal-ai/kolors",             "label": "Kolors"},
]


def _fetch_siliconflow(api_key: str) -> list[dict]:
    """Fetch image models from SiliconFlow /v1/models and filter by keyword."""
    try:
        resp = httpx.get(
            f"{_SF_BASE}/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=_SF_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json().get("data") or []
        models = []
        for m in data:
            mid = (m.get("id") or "").lower()
            if any(kw in mid for kw in _SF_IMAGE_KEYWORDS):
                models.append({"id": m["id"], "label": m.get("id", m["id"])})
        models.sort(key=lambda x: x["id"])
        logger.info("SiliconFlow image models fetched: %d", len(models))
        return models
    except Exception:
        logger.exception("SiliconFlow image model list fetch failed")
        return []


def get_image_models(provider: str, api_key: str | None) -> list[dict]:
    """Return available image models for `provider`. Empty list if key missing."""
    if provider == "siliconflow":
        if not api_key:
            return []
        return _fetch_siliconflow(api_key)
    if provider == "runware":
        return RUNWARE_MODELS if api_key else []
    if provider == "falai":
        return FALAI_MODELS if api_key else []
    return []
