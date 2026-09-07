"""Per-user LLM generation settings (general config, applies to all the user's
OVAs). GET returns the effective config + catalog for the UI; PUT validates a
chosen config against the curated catalog and persists it on the user row.

Adaptador HTTP: el filtrado de catálogo y la forma del payload viven en
`users.domain.llm_settings` (el catálogo se inyecta); las llamadas a llm se
resuelven aquí (edge sancionado users -> llm).
"""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from auth.dependencies import get_current_user
from core.database import get_db
from core.rate_limit import limiter
from llm.catalog.catalog_refresh import (
    get_catalog_entries,
    get_full_catalog_entries,
    get_provider_status,
    refresh_catalog,
)
from llm.catalog.model_catalog import (
    DEFAULTS,
    TIMEOUT_MAX,
    TIMEOUT_MIN,
    merge_with_defaults,
    sanitize_settings,
)
from llm.providers import TEXT_PROVIDERS
from models import User
from users.application.dto import SaveLlmSettingsInput
from users.container import UsersUseCases, build_users
from users.domain.errors import UserError
from users.domain.llm_settings import (
    build_filtered_catalog,
    enabled_keys,
    filter_full_catalog,
    providers_and_types,
)
from users.interface.http.error_map import to_http_exception

router = APIRouter(tags=["Ajustes de usuario"])
logger = structlog.get_logger(__name__)


class LlmSettingsUpdate(BaseModel):
    settings: dict


def _own_model_keys(user: User, *, has_key: bool) -> set[tuple[str, str]]:
    """Modelos fuera del catálogo curado que este usuario puede usar.

    `enabled_models` la controla el propio usuario (`PUT /me/enabled-models`), así
    que honrarla sin más deja elegir cualquier modelo del catálogo completo —
    incluidos los caros— pagando con la key de la plataforma. Solo cuenta si el
    usuario aporta su propia API key: si no, se queda con los modelos que fijó el
    administrador (DEFAULTS).
    """
    return enabled_keys(user.enabled_models or []) if has_key else set()


@router.get("/me/llm-settings", summary="Obtener los ajustes de LLM propios")
def get_llm_settings(
    request: Request,
    current_user: User = Depends(get_current_user),
    users: UsersUseCases = Depends(build_users),
):
    """Effective per-type config (user override or default) + filtered catalog +
    enabled_models + full catalog (search/category/paginated).

    Query params: search, category, page, page_size
    """
    all_entries = get_catalog_entries()
    has_key = users.has_own_llm_key.execute(current_user.id, TEXT_PROVIDERS)
    ek = _own_model_keys(current_user, has_key=has_key)
    default_keys = {(d["provider"], d["model_id"]) for d in DEFAULTS.values()}

    filtered_catalog = build_filtered_catalog(
        all_entries, get_full_catalog_entries(), ek, default_keys
    )

    full = get_full_catalog_entries()
    search = (request.query_params.get("search") or "").strip().lower()
    category = (request.query_params.get("category") or "all").strip().lower()
    model_type = (request.query_params.get("type") or "all").strip().lower()
    full = filter_full_catalog(full, search, category, model_type)

    page = max(1, int(request.query_params.get("page") or 1))
    page_size = min(int(request.query_params.get("page_size") or 50), 1000)
    offset = (page - 1) * page_size
    total = len(full)
    page_items = full[offset : offset + page_size]

    all_entries_active = [e for e in get_full_catalog_entries() if e.get("active")]
    all_providers, all_types = providers_and_types(all_entries_active)

    return {
        "settings": merge_with_defaults(current_user.llm_settings, extra_keys=ek),
        "has_own_llm_key": has_key,
        "catalog": filtered_catalog,
        "catalog_all": [e for e in all_entries if e.get("active")],
        "catalog_full": page_items,
        "full_total": total,
        "full_page": page,
        "full_page_size": page_size,
        "full_has_more": offset + page_size < total,
        "categories": ["all", "recommended"] + all_providers,
        "types": ["all"] + all_types,
        "defaults": DEFAULTS,
        "enabled_models": current_user.enabled_models or [],
        "timeout_bounds": [TIMEOUT_MIN, TIMEOUT_MAX],
        "catalog_status": get_provider_status(),
    }


@router.post(
    "/me/llm-settings/refresh-catalog", summary="Refrescar el catálogo de modelos del usuario"
)
@limiter.limit("3/minute")
def refresh_llm_catalog(
    request: Request,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """Re-fetch the provider catalogs on demand (retry path after a transient
    failure). Always 200 — the per-provider status payload IS the result."""
    try:
        refresh_catalog(db)
    except Exception:
        logger.exception("user-triggered catalog refresh failed")
    return {"catalog_status": get_provider_status()}


@router.put("/me/llm-settings", summary="Actualizar los ajustes de LLM propios")
@limiter.limit("20/minute")
def put_llm_settings(
    request: Request,
    payload: LlmSettingsUpdate,
    current_user: User = Depends(get_current_user),
    users: UsersUseCases = Depends(build_users),
):
    """Validate against the catalog and persist. 400 on any invalid model/timeout."""
    ek = _own_model_keys(
        current_user,
        has_key=users.has_own_llm_key.execute(current_user.id, TEXT_PROVIDERS),
    )
    try:
        clean = sanitize_settings(payload.settings, extra_keys=ek)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None

    try:
        saved = users.save_llm_settings.execute(
            SaveLlmSettingsInput(user_id=current_user.id, settings=clean)
        )
    except UserError as err:
        raise to_http_exception(err) from None

    return {"settings": merge_with_defaults(saved, extra_keys=ek)}
