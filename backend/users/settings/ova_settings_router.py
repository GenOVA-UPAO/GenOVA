"""Per-user OVA generation settings: image count, image provider, and image model."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import get_db
from core.rate_limit import limiter
from llm.images.image_providers import IMAGE_PROVIDERS
from models import User

router = APIRouter()
logger = logging.getLogger(__name__)

_DEFAULTS = {"max_images": 2, "image_provider": "cloudflare", "image_model": None}
_MAX_IMAGES_MAX = 10

_PROVIDER_DEFAULT_MODEL = {
    "siliconflow": "stabilityai/stable-diffusion-3-5-large",
    "runware": "runware:100@1",
    "falai": "fal-ai/flux/schnell",
    "cloudflare": "@cf/black-forest-labs/flux-1-schnell",
}


class OvaSettingsUpdate(BaseModel):
    max_images: int = Field(ge=0, le=_MAX_IMAGES_MAX)
    image_provider: str
    image_model: str | None = None


def _effective(raw: dict | None) -> dict:
    s = raw or {}
    provider = s.get("image_provider", _DEFAULTS["image_provider"])
    return {
        "max_images": s.get("max_images", _DEFAULTS["max_images"]),
        "image_provider": provider,
        "image_model": s.get("image_model") or _PROVIDER_DEFAULT_MODEL.get(provider),
    }


@router.get("/me/ova-settings")
def get_ova_settings(current_user: User = Depends(get_current_user)):
    return {
        "settings": _effective(current_user.ova_settings),
        "image_providers": list(IMAGE_PROVIDERS),
        "defaults": _DEFAULTS,
    }


@router.get("/me/image-models")
@limiter.limit("30/minute")
def get_image_models(
    request: Request,
    provider: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return available image models for `provider` using the user's resolved API key."""
    from llm.clients.key_resolver import resolve_key
    from llm.images.image_model_list import get_image_models as _get_models

    if provider not in IMAGE_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"provider debe ser uno de: {', '.join(IMAGE_PROVIDERS)}",
        )
    api_key = resolve_key(provider, current_user.user_api_keys, db)
    models = _get_models(provider, api_key)
    return {"provider": provider, "models": models}


@router.put("/me/ova-settings")
@limiter.limit("20/minute")
def put_ova_settings(
    request: Request,
    payload: OvaSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.image_provider not in IMAGE_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"image_provider debe ser uno de: {', '.join(IMAGE_PROVIDERS)}",
        )

    current_user.ova_settings = {
        "max_images": payload.max_images,
        "image_provider": payload.image_provider,
        "image_model": payload.image_model,
    }
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("OVA settings write failed for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar la configuración. Intenta de nuevo.",
        ) from None

    return {"settings": _effective(current_user.ova_settings)}
