"""Pruebas del administrador antes de cambiar de modelo o de clave.

- ``POST /llm-config/test-model``: llamada mínima a un modelo con la clave de
  la plataforma (la que usaría la generación si ese modelo fuera el elegido).
- ``POST /platform-config/{provider}/check``: «Probar conexión» de la clave de
  plataforma de un proveedor (válida o no, y cuántos modelos da).

Las claves se leen aquí y se pasan tal cual al cliente del proveedor: nunca
vuelven en la respuesta ni se registran.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from auth.dependencies import require_admin
from core.database import get_db
from core.rate_limit import limiter
from llm.catalog.provider_check import check_provider_key
from llm.clients.key_resolver import resolve_platform_key
from llm.providers import ALL_PROVIDERS, TEXT_PROVIDERS
from llm.utils.model_probe import probe_model, probe_throttle
from models import User

router = APIRouter(tags=["Admin · Plataforma"])


class ModelTestRequest(BaseModel):
    provider: str = Field(min_length=1, max_length=40)
    model_id: str = Field(min_length=1, max_length=200)


def ensure_text_provider(provider: str) -> None:
    if provider not in TEXT_PROVIDERS:
        raise HTTPException(
            status_code=422,
            detail="Solo se pueden probar modelos de texto.",
        )


def ensure_probe_allowed(user_id) -> None:
    """Cada prueba es una llamada de pago: límite por persona."""
    wait = probe_throttle.retry_after(str(user_id))
    if wait:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Has hecho muchas pruebas seguidas. Espera {wait} s y vuelve a probar.",
            headers={"Retry-After": str(wait)},
        )


@router.post("/llm-config/test-model", summary="Probar un modelo con la clave de la plataforma")
@limiter.limit("20/minute")
def test_platform_model(
    request: Request,
    body: ModelTestRequest,
    admin: User = Depends(require_admin),
    db=Depends(get_db),
):
    """Llamada mínima al modelo. Siempre 200: el resultado (ok o el motivo del
    fallo) va en el cuerpo."""
    ensure_text_provider(body.provider)
    ensure_probe_allowed(admin.id)
    key, source = resolve_platform_key(body.provider, db)
    return probe_model(body.provider, body.model_id.strip(), key, key_source=source)


@router.post(
    "/platform-config/{provider}/check",
    summary="Probar la conexión con un proveedor (clave de plataforma)",
)
@limiter.limit("20/minute")
def check_platform_provider(
    request: Request,
    provider: str,
    _admin: User = Depends(require_admin),
    db=Depends(get_db),
):
    """¿La clave de plataforma de `provider` es válida y cuántos modelos da?"""
    if provider not in ALL_PROVIDERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proveedor desconocido.")
    key, source = resolve_platform_key(provider, db)
    return check_provider_key(provider, key, key_source=source)
