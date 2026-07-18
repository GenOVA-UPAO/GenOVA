"""Multi-provider image gen → base64 data URI (or None → placeholder).

huggingface | siliconflow | runware | falai | cloudflare | openrouter
"""

import base64
import os

import httpx
import structlog

logger = structlog.get_logger(__name__)
_TIMEOUT = 30.0


def _url_to_data_uri(url: str) -> str | None:
    try:
        resp = httpx.get(url, timeout=_TIMEOUT, follow_redirects=True)
        resp.raise_for_status()
        ct = resp.headers.get("content-type", "image/jpeg")
        if "svg" in ct:
            return None
        return f"data:{ct};base64," + base64.b64encode(resp.content).decode("ascii")
    except Exception as exc:
        logger.warning("image URL download failed", error=str(exc))
        return None


def _hf(prompt: str, api_key: str | None, width: int, height: int) -> str | None:
    from llm.images.images import fetch_image_data_uri

    return fetch_image_data_uri(prompt, width=width, height=height, api_key=api_key)


def _siliconflow(prompt: str, api_key: str | None, width: int, height: int, model: str | None = None) -> str | None:
    if not api_key:
        logger.warning("image generation skipped: no api_key", provider="siliconflow")
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
        logger.warning("image generation failed", provider="siliconflow", error=str(exc))
        return None


def _runware(prompt: str, api_key: str | None, width: int, height: int, model: str | None = None) -> str | None:
    if not api_key:
        logger.warning("image generation skipped: no api_key", provider="runware")
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
        logger.warning("image generation failed", provider="runware", error=str(exc))
        return None


def _falai(prompt: str, api_key: str | None, width: int, height: int, model: str | None = None) -> str | None:
    if not api_key:
        logger.warning("image generation skipped: no api_key", provider="falai")
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
        logger.warning("image generation failed", provider="falai", error=str(exc))
        return None


def _cloudflare(
    prompt: str, api_key: str | None, width: int, height: int, model: str | None = None
) -> str | None:
    from llm.images.image_cloudflare import generate_cloudflare_image

    return generate_cloudflare_image(prompt, api_key, width, height, model)


def _openrouter(
    prompt: str, api_key: str | None, width: int, height: int, model: str | None = None
) -> str | None:
    from llm.images.image_openrouter import generate_openrouter_image

    return generate_openrouter_image(prompt, api_key, width, height, model)


_PROVIDERS = {
    "huggingface": _hf,
    "siliconflow": _siliconflow,
    "runware": _runware,
    "falai": _falai,
    "cloudflare": _cloudflare,
    "openrouter": _openrouter,
}

IMAGE_PROVIDERS = tuple(_PROVIDERS.keys())

_MODEL_PROVIDERS = {"siliconflow", "runware", "falai", "cloudflare", "openrouter"}


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
    if provider in _MODEL_PROVIDERS:
        result = fn(clean, api_key, width, height, model)
    else:
        result = fn(clean, api_key, width, height)
    if result is None and provider != "huggingface":
        # Fallback (audit 2026-07-06 #5): el provider elegido no está configurado
        # o falló (p.ej. cloudflare sin CF_ACCOUNT_ID) → intentar huggingface con
        # la key de plataforma antes de degradar a placeholder.
        result = _hf(clean, _platform_hf_key(), width, height)
        if result:
            logger.info("image provider failed; huggingface fallback succeeded", provider=provider)
    return result


def _platform_hf_key() -> str | None:
    from core.database import SessionLocal
    from llm.clients.key_resolver import resolve_key

    db = None
    try:
        db = SessionLocal()
        return resolve_key("huggingface", None, db)
    except Exception:
        return resolve_key("huggingface", None)
    finally:
        if db is not None:
            db.close()


def build_image_settings(user, db) -> dict:
    """Delegate to llm_config imagen chain (+ legacy ova_settings)."""
    from llm.images.image_settings_resolve import build_image_settings as resolve

    return resolve(
        ova_settings=getattr(user, "ova_settings", None) or {},
        user_api_keys=getattr(user, "user_api_keys", None) or {},
        db=db, user_id=user.id,
    )

