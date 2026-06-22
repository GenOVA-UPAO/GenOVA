"""Multi-provider image generation with a uniform interface.

All providers return a base64 JPEG data URI so SCORM packages stay self-contained.
Returns None on any failure; callers must handle the None case with a placeholder.
Supported: huggingface | siliconflow | runware | falai
"""

import base64
import logging
import os

import httpx

logger = logging.getLogger(__name__)

_TIMEOUT = 30.0

# Gray SVG fallback — base64-encoded for universal HTML/SCORM compatibility.
IMG_PLACEHOLDER = (
    "data:image/svg+xml;base64,"
    "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MTIiIGhlaWdo"
    "dD0iNTEyIj48cmVjdCBmaWxsPSIjZTJlOGYwIiB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIvPjx0"
    "ZXh0IHg9IjI1NiIgeT0iMjY2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIy"
    "MiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzQ3NTU2OSI+SW1hZ2VuIG5vIGRpc3Bvbmli"
    "bGU8L3RleHQ+PC9zdmc+"
)


def _url_to_data_uri(url: str) -> str | None:
    """Download an image URL and return a base64 JPEG data URI."""
    try:
        resp = httpx.get(url, timeout=_TIMEOUT, follow_redirects=True)
        resp.raise_for_status()
        ct = resp.headers.get("content-type", "image/jpeg")
        if "svg" in ct:
            return None
        return f"data:{ct};base64," + base64.b64encode(resp.content).decode("ascii")
    except Exception as exc:
        logger.warning("Image URL download failed: %s", exc)
        return None


def _hf(prompt: str, api_key: str | None, width: int, height: int) -> str | None:
    from llm.images.images import fetch_image_data_uri

    return fetch_image_data_uri(prompt, width=width, height=height, api_key=api_key)


def _siliconflow(prompt: str, api_key: str | None, width: int, height: int, model: str | None = None) -> str | None:
    if not api_key:
        logger.warning("SiliconFlow image generation skipped: no api_key")
        return None
    model = model or os.getenv("SILICONFLOW_IMAGE_MODEL", "stabilityai/stable-diffusion-3-5-large")
    try:
        resp = httpx.post(
            "https://api.siliconflow.cn/v1/images/generations",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": model, "prompt": prompt, "image_size": f"{width}x{height}"},
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        url = resp.json()["images"][0]["url"]
        return _url_to_data_uri(url)
    except Exception as exc:
        logger.warning("SiliconFlow image generation failed: %s", exc)
        return None


def _runware(prompt: str, api_key: str | None, width: int, height: int, model: str | None = None) -> str | None:
    if not api_key:
        logger.warning("Runware image generation skipped: no api_key")
        return None
    model = model or os.getenv("RUNWARE_IMAGE_MODEL", "runware:100@1")
    try:
        resp = httpx.post(
            "https://api.runware.ai/v1",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=[
                {
                    "taskType": "authentication",
                    "apiKey": api_key,
                },
                {
                    "taskType": "imageInference",
                    "taskUUID": "genova-img",
                    "positivePrompt": prompt,
                    "model": model,
                    "width": width,
                    "height": height,
                    "numberResults": 1,
                    "outputFormat": "JPEG",
                    "outputType": ["URL"],
                },
            ],
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        for item in data:
            if item.get("taskType") == "imageInference":
                url = item.get("imageURL") or (item.get("imageURLs") or [None])[0]
                if url:
                    return _url_to_data_uri(url)
        return None
    except Exception as exc:
        logger.warning("Runware image generation failed: %s", exc)
        return None


def _falai(prompt: str, api_key: str | None, width: int, height: int, model: str | None = None) -> str | None:
    if not api_key:
        logger.warning("fal.ai image generation skipped: no api_key")
        return None
    model = model or os.getenv("FALAI_IMAGE_MODEL", "fal-ai/flux/schnell")
    try:
        resp = httpx.post(
            f"https://fal.run/{model}",
            headers={"Authorization": f"Key {api_key}", "Content-Type": "application/json"},
            json={"prompt": prompt, "image_size": {"width": width, "height": height}},
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        url = resp.json()["images"][0]["url"]
        return _url_to_data_uri(url)
    except Exception as exc:
        logger.warning("fal.ai image generation failed: %s", exc)
        return None


_PROVIDERS = {
    "huggingface": _hf,
    "siliconflow": _siliconflow,
    "runware": _runware,
    "falai": _falai,
}

IMAGE_PROVIDERS = tuple(_PROVIDERS.keys())


def get_image_data_uri(
    prompt: str,
    provider: str = "huggingface",
    api_key: str | None = None,
    width: int = 512,
    height: int = 512,
    model: str | None = None,
) -> str | None:
    """Generate an image for `prompt` using the specified provider.

    Returns a base64 data URI or None on failure.
    """
    clean = (prompt or "").strip()
    if not clean:
        return None
    fn = _PROVIDERS.get(provider, _hf)
    if provider in ("siliconflow", "runware", "falai"):
        return fn(clean, api_key, width, height, model)
    return fn(clean, api_key, width, height)


def enrich_with_images(json_data, image_settings: dict | None = None) -> dict[str, str]:
    """For engage JSON whose items have `prompt_imagen`, fetch images and inject
    `image_placeholder` keys. Returns {placeholder: data_uri} for post-LLM replacement.

    image_settings keys: max_images (int), provider (str), api_key (str|None)
    """
    if not isinstance(json_data, list) or not json_data:
        return {}
    first = json_data[0] if isinstance(json_data[0], dict) else None
    if not first or "prompt_imagen" not in first:
        return {}

    settings = image_settings or {}
    default_max = int(os.getenv("OVA_MAX_GENERATED_IMAGES", "2"))
    max_images = int(settings.get("max_images", default_max))
    provider = settings.get("provider", "huggingface")
    api_key = settings.get("api_key") or None
    model = settings.get("image_model") or None

    if max_images <= 0:
        return {}

    from concurrent.futures import ThreadPoolExecutor

    targets = json_data[:max_images]
    prompts = [(item.get("prompt_imagen") or "").strip() for item in targets]

    with ThreadPoolExecutor(max_workers=2) as pool:
        uris = list(pool.map(lambda p: get_image_data_uri(p, provider, api_key, model=model), prompts))

    replacements: dict[str, str] = {}
    for i, (item, uri) in enumerate(zip(targets, uris, strict=True), start=1):
        placeholder = f"__IMG_{i}__"
        item["image_placeholder"] = placeholder
        replacements[placeholder] = uri or IMG_PLACEHOLDER
    return replacements
