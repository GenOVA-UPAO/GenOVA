"""Per-user OVA generation settings: image count, image provider, and image model.

Adaptador HTTP de los ajustes de OVA; las reglas puras viven en
`users.domain.ova_settings` y las llamadas a llm se resuelven aquí (edge
sancionado users -> llm).
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from auth.dependencies import get_current_user
from core.database import get_db
from core.rate_limit import limiter
from llm.images.image_providers import IMAGE_PROVIDERS
from models import User
from users.application.dto import SaveOvaSettingsInput
from users.container import UsersUseCases, build_users
from users.domain.errors import UserError
from users.domain.ova_settings import DEFAULTS, MAX_IMAGES_MAX, assert_provider_in, effective
from users.interface.http.error_map import to_http_exception

router = APIRouter(tags=["Ajustes de usuario"])


class OvaSettingsUpdate(BaseModel):
    max_images: int = Field(ge=0, le=MAX_IMAGES_MAX)
    image_provider: str
    image_model: str | None = None


@router.get("/me/ova-settings", summary="Obtener los ajustes de OVA propios")
def get_ova_settings(current_user: User = Depends(get_current_user)):
    return {
        "settings": effective(current_user.ova_settings),
        "image_providers": list(IMAGE_PROVIDERS),
        "defaults": DEFAULTS,
    }


@router.get("/me/image-models", summary="Listar los modelos de imagen disponibles")
@limiter.limit("30/minute")
def get_image_models(
    request: Request,
    provider: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Return available image models for `provider` using the user's resolved API key."""
    from llm.clients.key_resolver import resolve_key
    from llm.images.image_model_list import get_image_models as _get_models

    try:
        assert_provider_in(provider, IMAGE_PROVIDERS, "provider")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None

    api_key = resolve_key(provider, current_user.user_api_keys, db)
    models = _get_models(provider, api_key)
    return {"provider": provider, "models": models}


@router.put("/me/ova-settings", summary="Actualizar los ajustes de OVA propios")
@limiter.limit("20/minute")
def put_ova_settings(
    request: Request,
    payload: OvaSettingsUpdate,
    current_user: User = Depends(get_current_user),
    users: UsersUseCases = Depends(build_users),
):
    try:
        assert_provider_in(payload.image_provider, IMAGE_PROVIDERS, "image_provider")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None

    try:
        saved = users.save_ova_settings.execute(
            SaveOvaSettingsInput(
                user_id=current_user.id,
                settings={
                    "max_images": payload.max_images,
                    "image_provider": payload.image_provider,
                    "image_model": payload.image_model,
                },
            )
        )
    except UserError as err:
        raise to_http_exception(err) from None

    return {"settings": effective(saved)}
