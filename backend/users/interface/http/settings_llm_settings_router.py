"""Per-user LLM generation settings (general config, applies to all the user's
OVAs). GET returns the effective config + catalog for the UI; PUT validates a
chosen config against the curated catalog and persists it on the user row.

Con clave propia de un proveedor, la lista de ese proveedor es la que devuelve
su API con la clave del usuario (`llm.catalog.user_catalog`), aunque la
plataforma no tenga clave para él. El administrador sigue viendo el catálogo de
plataforma.

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
    default_catalog_floor,
    merge_with_defaults,
    sanitize_settings,
)
from llm.catalog.user_catalog import UserCatalog, load_user_catalog
from llm.providers import TEXT_PROVIDERS
from llm.utils.user_overrides import honored_overrides, own_key_providers
from models import User
from users.application.dto import SaveLlmSettingsInput
from users.container import UsersUseCases, build_users
from users.domain.errors import UserError
from users.domain.llm_settings import (
    add_own_provider_pools,
    apply_catalog_floor,
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


def _user_catalog(user: User, *, force: bool = False) -> UserCatalog:
    """Listas pedidas con las claves propias del usuario. Vacío para el
    administrador: trabaja con las claves y el catálogo de la plataforma."""
    if _is_admin(user):
        return UserCatalog({})
    return load_user_catalog(user.id, user.user_api_keys, force=force)


def _own_catalog_keys(user: User, uc: UserCatalog, merged_full: list[dict]) -> set:
    """Modelos que el usuario puede elegir con sus claves. Si la lista de un
    proveedor no se pudo comprobar (fallo pasajero), lo ya guardado sigue valiendo."""
    keys = uc.model_keys(merged_full)
    unverified = uc.unverified_providers()
    if unverified:
        for entry in (user.llm_settings or {}).values():
            if not isinstance(entry, dict):
                continue
            for item in [entry, *(entry.get("fallbacks") or [])]:
                if isinstance(item, dict) and item.get("provider") in unverified:
                    keys.add((item["provider"], item.get("model_id")))
    return keys


def _choosable_catalog(
    uc: UserCatalog, merged_full: list[dict], curated: list[dict], ek: set
) -> dict[str, list[dict]]:
    """Modelos por proveedor para los selectores (activados + defaults + los
    de los proveedores con clave propia + suelo de defaults)."""
    default_keys = {(d["provider"], d["model_id"]) for d in DEFAULTS.values()}
    filtered = build_filtered_catalog(curated, merged_full, ek, default_keys)
    filtered = add_own_provider_pools(filtered, merged_full, uc.providers, ek - default_keys)
    return apply_catalog_floor(filtered, default_catalog_floor())


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
    uc = _user_catalog(current_user)
    merged_full = uc.merge_full(get_full_catalog_entries())
    all_entries = uc.adjust_curated(get_catalog_entries())
    has_key = users.has_own_llm_key.execute(current_user.id, TEXT_PROVIDERS)
    ek = _own_model_keys(current_user, has_key=has_key)
    filtered_catalog = _choosable_catalog(uc, merged_full, all_entries, ek)

    search = (request.query_params.get("search") or "").strip().lower()
    category = (request.query_params.get("category") or "all").strip().lower()
    model_type = (request.query_params.get("type") or "all").strip().lower()
    full = filter_full_catalog(merged_full, search, category, model_type)

    page = max(1, int(request.query_params.get("page") or 1))
    page_size = min(int(request.query_params.get("page_size") or 50), 1000)
    offset = (page - 1) * page_size
    total = len(full)
    page_items = full[offset : offset + page_size]

    # Todas las filas, también las inactivas de una clave propia rechazada: se
    # ven en el catálogo, así que su proveedor debe poder filtrarse.
    all_providers, all_types = providers_and_types(merged_full)

    return {
        "settings": _settings_view(
            current_user, ek | _own_catalog_keys(current_user, uc, merged_full)
        ),
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
        # Lo que de verdad se usa sin clave propia (semilla ⊕ config del admin):
        # la vista de solo lectura mostraba `defaults`, la semilla fija, y el
        # usuario veía otro modelo y «sin respaldos» cuando el admin sí los tenía.
        "platform": _platform_config(),
        "enabled_models": current_user.enabled_models or [],
        "timeout_bounds": [TIMEOUT_MIN, TIMEOUT_MAX],
        "catalog_status": get_provider_status(),
        # Estado de las listas pedidas con las claves propias (None para el admin).
        "own_catalog_status": _own_status(current_user, uc, merged_full),
    }


def _own_status(user: User, uc: UserCatalog, merged_full: list[dict]) -> dict | None:
    return None if _is_admin(user) else uc.status(merged_full)


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
    failure). Always 200 — the per-provider status payload IS the result.

    También vuelve a pedir, sin caché, las listas de las claves propias."""
    try:
        refresh_catalog(db)
    except Exception:
        logger.exception("user-triggered catalog refresh failed")
    uc = _user_catalog(current_user, force=True)
    merged_full = uc.merge_full(get_full_catalog_entries())
    return {
        "catalog_status": get_provider_status(),
        "own_catalog_status": _own_status(current_user, uc, merged_full),
    }


@router.put("/me/llm-settings", summary="Actualizar los ajustes de LLM propios")
@limiter.limit("20/minute")
def put_llm_settings(
    request: Request,
    payload: LlmSettingsUpdate,
    current_user: User = Depends(get_current_user),
    users: UsersUseCases = Depends(build_users),
):
    """Validate against the catalog and persist. 400 on any invalid model/timeout.

    Además del catálogo curado y los modelos activados, vale cualquier modelo de
    la lista que el proveedor devuelve con la clave propia del usuario."""
    uc = _user_catalog(current_user)
    ek = _own_model_keys(
        current_user,
        has_key=users.has_own_llm_key.execute(current_user.id, TEXT_PROVIDERS),
    ) | _own_catalog_keys(current_user, uc, uc.merge_full(get_full_catalog_entries()))
    try:
        clean = sanitize_settings(payload.settings, extra_keys=ek)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from None
    missing = _providers_without_own_key(clean, current_user)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Añade tu clave de {', '.join(missing)} en Credenciales para usar sus modelos: "
                "los modelos que elijas se pagan con tu propia clave."
            ),
        )

    try:
        saved = users.save_llm_settings.execute(
            SaveLlmSettingsInput(user_id=current_user.id, settings=clean)
        )
    except UserError as err:
        raise to_http_exception(err) from None

    return {"settings": _settings_view(current_user, ek, stored=saved)}


def _platform_config() -> dict:
    """Modelos por tarea y respaldos efectivos (solo ids de modelo, sin claves)."""
    from llm.router import effective_llm_config

    return effective_llm_config()


def _is_admin(user: User) -> bool:
    return bool(getattr(user, "admin_flag_cached", False))


def _providers_without_own_key(clean: dict, user: User) -> list[str]:
    """Proveedores elegidos (principal o respaldo) sin clave propia del usuario."""
    if _is_admin(user):
        return []
    own = own_key_providers(user.user_api_keys)
    chosen = {e["provider"] for e in clean.values()} | {
        f["provider"] for e in clean.values() for f in e.get("fallbacks", [])
    }
    return sorted(chosen - own)


def _settings_view(
    user: User, extra_keys: set[tuple[str, str]], stored: dict | None = None
) -> dict:
    """Ajustes por tarea para la UI, con `override` = elección propia vigente."""
    settings = user.llm_settings if stored is None else stored
    honored = honored_overrides(settings, user.user_api_keys, is_admin=_is_admin(user))
    return settings_view(
        merge_with_defaults(honored, extra_keys=extra_keys),
        honored,
        (_platform_config().get("defaults") or {}),
    )


def settings_view(merged: dict, honored: dict, platform_defaults: dict) -> dict:
    """Marca qué tareas tienen elección propia y, en las demás, muestra el modelo
    de la plataforma (config del admin), no la semilla: antes la UI enseñaba la
    semilla como si fuera la elección del usuario y al guardar quedaba fijada."""
    view: dict[str, dict] = {}
    for tipo, entry in merged.items():
        own = honored.get(tipo) or {}
        is_override = (own.get("provider"), own.get("model_id")) == (
            entry["provider"],
            entry["model_id"],
        )
        item = dict(entry, override=is_override)
        platform = platform_defaults.get(tipo) or {}
        if not is_override and platform.get("provider") and platform.get("model_id"):
            item.update(provider=platform["provider"], model_id=platform["model_id"], fallbacks=[])
        view[tipo] = item
    return view
