"""Per-user OVA generation settings: image count and image provider."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from llm.image_providers import IMAGE_PROVIDERS
from models import User
from rate_limit import limiter

router = APIRouter()
logger = logging.getLogger(__name__)

_DEFAULTS = {"max_images": 2, "image_provider": "huggingface"}
_MAX_IMAGES_MAX = 10


class OvaSettingsUpdate(BaseModel):
    max_images: int = Field(ge=0, le=_MAX_IMAGES_MAX)
    image_provider: str


def _effective(raw: dict | None) -> dict:
    s = raw or {}
    return {
        "max_images": s.get("max_images", _DEFAULTS["max_images"]),
        "image_provider": s.get("image_provider", _DEFAULTS["image_provider"]),
    }


@router.get("/me/ova-settings")
def get_ova_settings(current_user: User = Depends(get_current_user)):
    return {
        "settings": _effective(current_user.ova_settings),
        "image_providers": list(IMAGE_PROVIDERS),
        "defaults": _DEFAULTS,
    }


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
