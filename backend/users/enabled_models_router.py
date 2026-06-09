"""Per-user enabled model allowlist — toggle which models from the catalog
the user wants visible in their LLM settings dropdowns.

GET returns the current list; PUT persists a new list, validated against the
curated catalog. System default models can never be disabled.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from agents.model_catalog import DEFAULTS, is_valid_model
from auth.dependencies import get_current_user
from database import get_db
from models import User
from rate_limit import limiter

router = APIRouter()
logger = logging.getLogger(__name__)


class EnabledModelsUpdate(BaseModel):
    models: list[dict]


def _validate_enabled_models(payload: list[dict]) -> list[dict]:
    seen: set[tuple[str, str]] = set()
    clean: list[dict] = []
    for item in payload:
        provider = item.get("provider")
        model_id = item.get("model_id")
        if not (provider and model_id):
            continue
        key = (provider, model_id)
        if key in seen:
            continue
        if not is_valid_model(provider, model_id):
            raise ValueError(f"Modelo no reconocido: {provider}/{model_id}")
        seen.add(key)
        clean.append({"provider": provider, "model_id": model_id})

    defaults = {(d["provider"], d["model_id"]) for d in DEFAULTS.values()}
    for d in defaults:
        if d not in seen:
            clean.append({"provider": d[0], "model_id": d[1]})

    return clean


@router.get("/me/enabled-models")
def get_enabled_models(current_user: User = Depends(get_current_user)):
    models = current_user.enabled_models or []
    defaults = {(d["provider"], d["model_id"]) for d in DEFAULTS.values()}
    return {"models": models, "defaults": [{"provider": p, "model_id": m} for p, m in defaults]}


@router.put("/me/enabled-models")
@limiter.limit("20/minute")
def put_enabled_models(
    request: Request,
    payload: EnabledModelsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        clean = _validate_enabled_models(payload.models)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None

    current_user.enabled_models = clean
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Enabled models write failed for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar la lista de modelos. Intenta de nuevo.",
        ) from None

    return {"models": clean}
