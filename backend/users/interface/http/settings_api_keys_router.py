"""Per-user provider API keys — masked GET, upsert/delete PUT.

Keys are stored plaintext in the user_api_keys JSONB column but never leave
the infrastructure adapter unmasked: they are ALWAYS returned masked (last 4
chars visible) and NEVER logged. An empty string value removes the key (falls
back to platform/env key).
"""

from fastapi import APIRouter, Depends, Request

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from llm.providers import ALL_PROVIDERS
from models import User
from users.application.dto import SaveApiKeysInput
from users.container import UsersUseCases, build_users
from users.domain.errors import UserError
from users.interface.http.error_map import to_http_exception

router = APIRouter(tags=["Ajustes de usuario"])


@router.get("/me/api-keys", summary="Obtener las claves de API propias")
def get_api_keys(
    current_user: User = Depends(get_current_user),
    users: UsersUseCases = Depends(build_users),
):
    """Return masked status for all configurable providers."""
    return {
        "api_keys": users.get_api_keys.execute(current_user.id),
        "providers": list(ALL_PROVIDERS),
    }


@router.put("/me/api-keys", summary="Guardar las claves de API propias")
@limiter.limit("10/minute")
def put_api_keys(
    request: Request,
    payload: dict,
    current_user: User = Depends(get_current_user),
    users: UsersUseCases = Depends(build_users),
):
    """Upsert or delete provider API keys.

    Pass `{provider: "key"}` to set, `{provider: ""}` to remove.
    Unknown providers are ignored.
    """
    try:
        api_keys = users.save_api_keys.execute(
            SaveApiKeysInput(user_id=current_user.id, payload=payload, providers=ALL_PROVIDERS)
        )
    except UserError as err:
        raise to_http_exception(err) from None

    return {"api_keys": api_keys}
