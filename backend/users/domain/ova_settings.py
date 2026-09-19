"""Reglas puras de los ajustes de OVA por usuario.

Defaults, modelo por provider y validación de proveedor. La lista de
IMAGE_PROVIDERS se inyecta (users.application no importa llm); ValueError con
los mensajes exactos que el router traduce a 400.
"""

from __future__ import annotations

DEFAULTS = {"max_images": 2, "image_provider": "cloudflare", "image_model": None}
MAX_IMAGES_MAX = 10

PROVIDER_DEFAULT_MODEL = {
    "siliconflow": "stabilityai/stable-diffusion-3-5-large",
    "runware": "runware:100@1",
    "falai": "fal-ai/flux/schnell",
    "cloudflare": "@cf/black-forest-labs/flux-1-schnell",
}


def effective(raw: dict | None) -> dict:
    s = raw or {}
    provider = s.get("image_provider", DEFAULTS["image_provider"])
    return {
        "max_images": s.get("max_images", DEFAULTS["max_images"]),
        "image_provider": provider,
        "image_model": s.get("image_model") or PROVIDER_DEFAULT_MODEL.get(provider),
    }


def assert_provider_in(provider: str, providers, label: str) -> None:
    if provider not in providers:
        raise ValueError(f"{label} debe ser uno de: {', '.join(providers)}")
