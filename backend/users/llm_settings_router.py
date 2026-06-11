"""Per-user LLM generation settings (general config, applies to all the user's
OVAs). GET returns the effective config + catalog for the UI; PUT validates a
chosen config against the curated catalog and persists it on the user row."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from database import get_db
from llm.catalog_refresh import (
    get_catalog_entries,
    get_full_catalog_entries,
    get_provider_status,
    refresh_catalog,
)
from llm.model_catalog import (
    DEFAULTS,
    TIMEOUT_MAX,
    TIMEOUT_MIN,
    is_default_model,
    merge_with_defaults,
    sanitize_settings,
)
from models import User
from rate_limit import limiter

router = APIRouter()
logger = logging.getLogger(__name__)


class LlmSettingsUpdate(BaseModel):
    settings: dict


@router.get("/me/llm-settings")
def get_llm_settings(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Effective per-type config (user override or default) + filtered catalog +
    enabled_models + full catalog (search/category/paginated).

    Query params: search, category, page, page_size
    """
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

    full = get_full_catalog_entries()
    search = (request.query_params.get("search") or "").strip().lower()
    category = (request.query_params.get("category") or "all").strip().lower()

    if search:
        full = [
            e
            for e in full
            if search in e["model_id"].lower() or search in (e.get("label") or "").lower()
        ]
    if category == "recommended":
        full = [e for e in full if e.get("curated")]
    elif category and category != "all":
        full = [e for e in full if e.get("category") == category]

    page = max(1, int(request.query_params.get("page") or 1))
    page_size = min(int(request.query_params.get("page_size") or 50), 100)
    offset = (page - 1) * page_size
    total = len(full)
    page_items = full[offset : offset + page_size]

    all_categories = sorted(
        {e.get("category", "texto") for e in get_full_catalog_entries() if e.get("active")}
    )

    return {
        "settings": merge_with_defaults(current_user.llm_settings),
        "catalog": filtered_catalog,
        "catalog_all": [e for e in all_entries if e.get("active")],
        "catalog_full": page_items,
        "full_total": total,
        "full_page": page,
        "full_page_size": page_size,
        "full_has_more": offset + page_size < total,
        "categories": ["all", "recommended"]
        + [c for c in all_categories if c not in ("all", "recommended")],
        "defaults": DEFAULTS,
        "enabled_models": enabled,
        "timeout_bounds": [TIMEOUT_MIN, TIMEOUT_MAX],
        "catalog_status": get_provider_status(),
    }


@router.post("/me/llm-settings/refresh-catalog")
@limiter.limit("3/minute")
def refresh_llm_catalog(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Re-fetch the provider catalogs on demand (retry path after a transient
    failure). Always 200 — the per-provider status payload IS the result."""
    try:
        refresh_catalog(db)
    except Exception:
        logger.exception("User-triggered catalog refresh failed")
    return {"catalog_status": get_provider_status()}


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
