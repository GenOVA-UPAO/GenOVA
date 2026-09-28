"""Admin GET/PUT /api/admin/guardrails — mismo estilo que /api/admin/nodes-config."""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status

from auth.dependencies import require_admin
from core.database import get_db
from core.rate_limit import limiter
from generation.domain.guardrails import validate_guardrail_updates
from generation.infrastructure.guardrails_store import (
    get_guardrails_config,
    save_guardrails_config,
)

router = APIRouter(tags=["Admin · Plataforma"])
logger = structlog.get_logger(__name__)


@router.get("/guardrails", summary="Obtener la configuración de guardrails de generación")
def get_guardrails_endpoint(
    _admin: None = Depends(require_admin),
):
    """Devuelve las 5 claves del contrato. La lista de términos no se ofusca."""
    return get_guardrails_config()


@router.put("/guardrails", summary="Guardar la configuración de guardrails de generación")
@limiter.limit("10/minute")
def put_guardrails_endpoint(
    request: Request,
    payload: dict,
    _admin: None = Depends(require_admin),
    db=Depends(get_db),
):
    try:
        updates = validate_guardrail_updates(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None

    try:
        return save_guardrails_config(updates, db)
    except Exception:
        logger.exception("guardrails config write failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar la configuración de guardrails.",
        ) from None
