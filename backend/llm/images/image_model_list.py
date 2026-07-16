"""Fetch or return the available image models per provider.

SiliconFlow: dynamic via /v1/models (OpenAI-compat).
Runware / fal.ai: curated lists (their APIs don't offer simple REST model listing).
"""

import httpx
import structlog

logger = structlog.get_logger(__name__)

_SF_BASE = "https://api.siliconflow.cn/v1"
_SF_TIMEOUT = 10.0

# Keywords that identify image-generation models in SiliconFlow's model list
_SF_IMAGE_KEYWORDS = frozenset(
    [
        "stable-diffusion",
        "flux",
        "kolors",
        "wanx",
        "cogview",
        "dall-e",
        "imagen",
        "sdxl",
        "deepfloyd",
        "playground",
    ]
)

# Curated fallback for the no-key catalog preload (HU-034). The live list is
# fetched via _fetch_siliconflow when the admin configures an API key.
SILICONFLOW_MODELS = [
    {"id": "black-forest-labs/FLUX.1-schnell", "label": "FLUX.1 Schnell (fast)"},
    {"id": "black-forest-labs/FLUX.1-dev", "label": "FLUX.1 Dev"},
    {"id": "stabilityai/stable-diffusion-3-5-large", "label": "Stable Diffusion 3.5 Large"},
    {"id": "Kwai-Kolors/Kolors", "label": "Kolors"},
]

RUNWARE_MODELS = [
    {"id": "runware:100@1", "label": "FLUX.1 Schnell (fast)"},
    {"id": "runware:101@1", "label": "FLUX.1 Dev"},
    {"id": "runware:97@1", "label": "Stable Diffusion 3.5 Large"},
    {"id": "runware:98@1", "label": "Stable Diffusion 3.5 Medium"},
    {"id": "runware:5@1", "label": "SDXL 1.0"},
]

FALAI_MODELS = [
    {"id": "fal-ai/flux/schnell", "label": "FLUX.1 Schnell (fast)"},
    {"id": "fal-ai/flux/dev", "label": "FLUX.1 Dev"},
    {"id": "fal-ai/flux-pro", "label": "FLUX Pro"},
    {"id": "fal-ai/flux-pro/v1.1", "label": "FLUX Pro v1.1"},
    {"id": "fal-ai/stable-diffusion-v3-medium", "label": "Stable Diffusion 3 Medium"},
    {"id": "fal-ai/aura-flow", "label": "AuraFlow"},
    {"id": "fal-ai/kolors", "label": "Kolors"},
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
        logger.info("image models fetched", provider="siliconflow", count=len(models))
        return models
    except Exception:
        logger.exception("image model list fetch failed", provider="siliconflow")
        return []


HF_IMAGE_MODELS_FALLBACK = [
    {"id": "black-forest-labs/FLUX.1-schnell", "label": "FLUX.1 Schnell (rápido, gratis)"},
    {"id": "black-forest-labs/FLUX.1-dev", "label": "FLUX.1 Dev"},
    {"id": "stabilityai/stable-diffusion-xl-base-1.0", "label": "SDXL 1.0"},
    {"id": "stabilityai/stable-diffusion-3.5-large", "label": "SD 3.5 Large"},
    {"id": "stabilityai/stable-diffusion-2-1", "label": "Stable Diffusion 2.1"},
]


def _fetch_huggingface_image_models() -> list[dict]:
    try:
        resp = httpx.get(
            "https://huggingface.co/api/models",
            params={
                "inference": "warm",
                "pipeline_tag": "text-to-image",
                "sort": "downloads",
                "limit": "30",
                "full": "false",
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        models = [{"id": m["id"], "label": m["id"]} for m in resp.json() if m.get("id")]
        return models or HF_IMAGE_MODELS_FALLBACK
    except Exception:
        logger.exception("image model list fetch failed", provider="huggingface")
        return HF_IMAGE_MODELS_FALLBACK


def get_image_models(provider: str, api_key: str | None) -> list[dict]:
    """Return available image models for `provider`. Empty list if key missing."""
    if provider == "huggingface":
        return _fetch_huggingface_image_models() if api_key else []
    if provider == "siliconflow":
        if not api_key:
            return []
        return _fetch_siliconflow(api_key)
    if provider == "runware":
        return RUNWARE_MODELS if api_key else []
    if provider == "falai":
        return FALAI_MODELS if api_key else []
    return []
