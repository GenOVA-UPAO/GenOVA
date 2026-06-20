"""Per-user LLM generation settings (general config, applies to all the user's
OVAs). GET returns the effective config + catalog for the UI; PUT validates a
chosen config against the curated catalog and persists it on the user row."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
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
from models import Role, User, UserRole
from rate_limit import limiter

router = APIRouter()
logger = logging.getLogger(__name__)


_LLM_PROVIDERS = ("groq", "openrouter", "opencode")


def _enabled_keys(user) -> set[tuple[str, str]]:
    """Set of (provider, model_id) the user has explicitly enabled."""
    enabled = user.enabled_models or []
    return {(e["provider"], e["model_id"]) for e in enabled if isinstance(e, dict)}


def _has_own_llm_key(user, db: Session) -> bool:
    """True when user has a personal LLM API key, or holds the admin role."""
    own = user.user_api_keys or {}
    if any(own.get(p) for p in _LLM_PROVIDERS):
        return True
    return (
        db.execute(
            select(UserRole)
            .join(Role)
            .where(UserRole.user_id == user.id, Role.name == "administrador")
        )
        .scalars()
        .first()
        is not None
    )


class LlmSettingsUpdate(BaseModel):
    settings: dict


@router.get("/me/llm-settings")
def get_llm_settings(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Effective per-type config (user override or default) + filtered catalog +
    enabled_models + full catalog (search/category/paginated).

    Query params: search, category, page, page_size
    """
    all_entries = get_catalog_entries()
    enabled_keys = _enabled_keys(current_user)

    # Step 1: curated models — visible when active + (enabled OR default).
    curated_key_set: set[tuple[str, str]] = set()
    filtered_catalog: dict[str, list[dict]] = {}
    for entry in all_entries:
        if not entry.get("active"):
            continue
        p = entry["provider"]
        key = (p, entry["model_id"])
        curated_key_set.add(key)
        if key not in enabled_keys and not is_default_model(p, entry["model_id"]):
            continue
        filtered_catalog.setdefault(p, []).append(entry)

    # Step 2: non-curated enabled models from the full catalog. A user who finds
    # and enables a model in the browser (e.g. qwen/qwen3-32b via OpenRouter)
    # must see it in the assignment dropdown even if it's not in CATALOG_ENTRIES.
    full_entries = get_full_catalog_entries()
    full_by_key = {(e["provider"], e["model_id"]): e for e in full_entries}
    for key in enabled_keys:
        if key in curated_key_set:
            continue  # already handled above
        fc_entry = full_by_key.get(key)
        if fc_entry and fc_entry.get("active"):
            filtered_catalog.setdefault(fc_entry["provider"], []).append(fc_entry)

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
        full = [e for e in full if e.get("provider") == category]

    page = max(1, int(request.query_params.get("page") or 1))
    page_size = min(int(request.query_params.get("page_size") or 50), 100)
    offset = (page - 1) * page_size
    total = len(full)
    page_items = full[offset : offset + page_size]

    all_providers = sorted(
        {e.get("provider", "") for e in get_full_catalog_entries() if e.get("active") and e.get("provider")}
    )

    return {
        "settings": merge_with_defaults(current_user.llm_settings, extra_keys=enabled_keys),
        "has_own_llm_key": _has_own_llm_key(current_user, db),
        "catalog": filtered_catalog,
        "catalog_all": [e for e in all_entries if e.get("active")],
        "catalog_full": page_items,
        "full_total": total,
        "full_page": page,
        "full_page_size": page_size,
        "full_has_more": offset + page_size < total,
        "categories": ["all", "recommended"] + all_providers,
        "defaults": DEFAULTS,
        "enabled_models": current_user.enabled_models or [],
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
    ek = _enabled_keys(current_user)
    try:
        clean = sanitize_settings(payload.settings, extra_keys=ek)
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

    return {"settings": merge_with_defaults(current_user.llm_settings, extra_keys=ek)}
