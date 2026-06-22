"""Per-user resource generation configs: {"phase:id": {"key": value, ...}}."""

import logging
import re

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import get_db
from core.rate_limit import limiter
from models import User

router = APIRouter()
logger = logging.getLogger(__name__)

_VALID_KEY = re.compile(r"^(engage|explore|explain|elaborate|evaluate):([1-9]|10)$")


def _validate(configs: dict) -> dict:
    if not isinstance(configs, dict):
        raise ValueError("configs debe ser un objeto")
    if len(configs) > 50:
        raise ValueError("Máximo 50 entradas de configuración")
    clean: dict = {}
    for k, v in configs.items():
        if not _VALID_KEY.match(k):
            raise ValueError(f"Clave inválida: {k!r}")
        if not isinstance(v, dict):
            raise ValueError(f"El valor de {k!r} debe ser un objeto")
        entry: dict = {}
        for fk, fv in v.items():
            if not isinstance(fk, str):
                raise ValueError(f"Subclave inválida en {k!r}")
            if not isinstance(fv, (int, float)):
                raise ValueError(f"Valor de {k!r}.{fk!r} debe ser numérico")
            entry[fk] = fv
        clean[k] = entry
    return clean


class ResourceConfigsUpdate(BaseModel):
    configs: dict


@router.get("/me/resource-configs")
def get_resource_configs(current_user: User = Depends(get_current_user)):
    return {"configs": current_user.resource_configs or {}}


@router.put("/me/resource-configs")
@limiter.limit("30/minute")
def put_resource_configs(
    request: Request,
    payload: ResourceConfigsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        clean = _validate(payload.configs)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None

    current_user.resource_configs = clean
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("resource_configs write failed for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar la configuración. Intenta de nuevo.",
        ) from None

    return {"configs": current_user.resource_configs}
