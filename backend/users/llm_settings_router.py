"""Per-user LLM generation settings (general config, applies to all the user's
OVAs). GET returns the effective config + catalog for the UI; PUT validates a
chosen config against the curated catalog and persists it on the user row."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from agents.catalog_refresh import get_catalog_entries
from agents.model_catalog import (
    DEFAULTS,
    TIMEOUT_MAX,
    TIMEOUT_MIN,
    is_default_model,
    merge_with_defaults,
    sanitize_settings,
)
from auth.dependencies import get_current_user
from database import get_db
from models import User
from rate_limit import limiter

router = APIRouter()
logger = logging.getLogger(__name__)


class LlmSettingsUpdate(BaseModel):
    settings: dict


@router.get("/me/llm-settings")
def get_llm_settings(current_user: User = Depends(get_current_user)):
    """Effective per-type config (user override or default) + filtered catalog +
    enabled_models + bounds."""
    all_entries = get_catalog_entries()
    enabled = current_user.enabled_models or []
    enabled_keys = {(e["provider"], e["model_id"]) for e in enabled if isinstance(e, dict)}

    filtered_catalog: dict[str, list[dict]] = {}
    for entry in all_entries:
        if not entry.get("active"):
            continue
        p = entry["provider"]
        key = (p, entry["model_id"])
        if key not in enabled_keys and not is_default_model(p, entry["model_id"]):
            continue
        filtered_catalog.setdefault(p, []).append(entry)

    return {
        "settings": merge_with_defaults(current_user.llm_settings),
        "catalog": filtered_catalog,
        "catalog_all": {e["provider"]: e for e in all_entries if e.get("active")},
        "defaults": DEFAULTS,
        "enabled_models": enabled,
        "timeout_bounds": [TIMEOUT_MIN, TIMEOUT_MAX],
    }


@router.put("/me/llm-settings")
@limiter.limit("20/minute")
def put_llm_settings(
    request: Request,
    payload: LlmSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Validate against the catalog and persist. 400 on any invalid model/timeout."""
    try:
        clean = sanitize_settings(payload.settings)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None

    current_user.llm_settings = clean
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("LLM settings write failed for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar la configuración. Intenta de nuevo.",
        ) from None

    return {"settings": merge_with_defaults(current_user.llm_settings)}
