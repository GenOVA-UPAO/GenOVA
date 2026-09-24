"""Pruebas del usuario con su clave propia.

- ``POST /me/llm-settings/test-model``: llamada mínima a un modelo con la clave
  propia del usuario para ese proveedor. Sin clave propia no se prueba: los
  modelos de la plataforma los prueba y los paga el administrador.
- ``POST /me/api-keys/{provider}/check``: «Probar conexión» de su clave.

La clave nunca vuelve en la respuesta ni se registra.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status

from auth.dependencies import get_current_user
from core.rate_limit import limiter
from llm.catalog.provider_check import check_provider_key
from llm.providers import ALL_PROVIDERS
from llm.utils.model_probe import probe_model
from models import User
from users.interface.http.admin_llm_probe_router import (
    ModelTestRequest,
    ensure_probe_allowed,
    ensure_text_provider,
)

router = APIRouter(tags=["Ajustes de usuario"])


def _own_key(user: User, provider: str) -> str | None:
    raw = (user.user_api_keys or {}).get(provider)
    return raw.strip() if isinstance(raw, str) and raw.strip() else None


@router.post("/me/llm-settings/test-model", summary="Probar un modelo con la clave propia")
@limiter.limit("20/minute")
def test_own_model(
    request: Request,
    body: ModelTestRequest,
    current_user: User = Depends(get_current_user),
):
    """Llamada mínima al modelo con la clave propia. Siempre 200 salvo que no
    haya clave propia (403) o se haya pasado el límite de pruebas (429)."""
    ensure_text_provider(body.provider)
    key = _own_key(current_user, body.provider)
    if key is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Añade tu clave de este proveedor en Credenciales para probar sus modelos.",
        )
    ensure_probe_allowed(current_user.id)
    return probe_model(body.provider, body.model_id.strip(), key, key_source="own")


@router.post("/me/api-keys/{provider}/check", summary="Probar la conexión con la clave propia")
@limiter.limit("20/minute")
def check_own_provider(
    request: Request,
    provider: str,
    current_user: User = Depends(get_current_user),
):
    if provider not in ALL_PROVIDERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor desconocido.")
    return check_provider_key(provider, _own_key(current_user, provider), key_source="own")
