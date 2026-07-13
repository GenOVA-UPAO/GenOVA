"""Commercial image provider backends (SiliconFlow / Runware / fal.ai / Cloudflare)."""

from __future__ import annotations

import base64
import os
from collections.abc import Callable

import httpx
import structlog

logger = structlog.get_logger(__name__)
_TIMEOUT = 30.0


def url_to_data_uri(url: str) -> str | None:
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


def siliconflow(prompt: str, api_key: str | None, width: int, height: int, model: str | None = None) -> str | None:
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
        return url_to_data_uri(resp.json()["images"][0]["url"])
    except Exception as exc:
        logger.warning("image generation failed", provider="siliconflow", error=str(exc))
        return None


def runware(prompt: str, api_key: str | None, width: int, height: int, model: str | None = None) -> str | None:
    if not api_key:
        logger.warning("image generation skipped: no api_key", provider="runware")
        return None
    model = model or os.getenv("RUNWARE_IMAGE_MODEL", "runware:100@1")
    try:
        resp = httpx.post(
            "https://api.runware.ai/v1",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=[
                {"taskType": "authentication", "apiKey": api_key},
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
        for item in resp.json():
            if item.get("taskType") == "imageInference":
                url = item.get("imageURL") or (item.get("imageURLs") or [None])[0]
                if url:
                    return url_to_data_uri(url)
        return None
    except Exception as exc:
        logger.warning("image generation failed", provider="runware", error=str(exc))
        return None


def falai(prompt: str, api_key: str | None, width: int, height: int, model: str | None = None) -> str | None:
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
        return url_to_data_uri(resp.json()["images"][0]["url"])
    except Exception as exc:
        logger.warning("image generation failed", provider="falai", error=str(exc))
        return None


def cloudflare(prompt: str, api_key: str | None, width: int, height: int, model: str | None = None) -> str | None:
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
        logger.warning("image unexpected response", provider="cloudflare", response=str(data)[:200])
        return None
    except Exception as exc:
        logger.warning("image generation failed", provider="cloudflare", error=str(exc))
        return None


BackendFn = Callable[..., str | None]
