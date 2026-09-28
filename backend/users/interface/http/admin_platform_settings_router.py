"""Admin-only platform API key management.

Admins can set platform-level API keys that all users fall back to when they
haven't configured their own. Keys live and die inside the platform settings
repository: they are stored in the platform_config table, returned MASKED,
and never logged.
"""

import threading

import structlog
from fastapi import APIRouter, Depends, Request

from auth.dependencies import require_admin
from core.rate_limit import limiter
from llm.providers import ALL_PROVIDERS, TEXT_PROVIDERS, env_configured_providers
from models import User
from users.application.dto import SavePlatformKeysInput
from users.container import UsersUseCases, build_users
from users.domain.errors import UserError
from users.interface.http.admin_llm_probe_router import router as probe_router
from users.interface.http.admin_llm_versions_router import apply_config
from users.interface.http.admin_llm_versions_router import router as versions_router
from users.interface.http.error_map import to_http_exception

router = APIRouter(tags=["Admin · Plataforma"])
logger = structlog.get_logger(__name__)


def _bg_catalog_refresh() -> None:
    """Re-fetch provider catalogs in background after a platform key change."""
    from core.database import SessionLocal
    from llm.catalog.catalog_refresh import refresh_catalog

    db = SessionLocal()
    try:
        # force: una clave recién puesta debe consultarse ya, aunque el último
        # refresco completo sea de hace menos de un minuto.
        refresh_catalog(db, force=True)
    finally:
        db.close()


@router.get("/platform-config", summary="Obtener la configuración de la plataforma")
def get_platform_config(
    _admin: None = Depends(require_admin),
    users: UsersUseCases = Depends(build_users),
):
    """Return masked platform API key status for all providers (admin-only)."""
    return {
        "platform_config": users.get_platform_keys.execute(),
        "providers": list(ALL_PROVIDERS),
        "server_keys": env_configured_providers(),
    }


@router.put("/platform-config", summary="Actualizar la configuración de la plataforma")
@limiter.limit("10/minute")
def put_platform_config(
    request: Request,
    payload: dict,
    _admin: None = Depends(require_admin),
    users: UsersUseCases = Depends(build_users),
):
    """Upsert or delete platform API keys (admin-only).

    Pass `{provider: "key"}` to set, `{provider: ""}` to remove.
    """
    try:
        updates = users.save_platform_keys.execute(
            SavePlatformKeysInput(payload=payload, providers=ALL_PROVIDERS)
        )
    except UserError as err:
        raise to_http_exception(err) from None

    if any(p in TEXT_PROVIDERS for p in updates):
        threading.Thread(target=_bg_catalog_refresh, daemon=True).start()
        logger.info("catalog refresh triggered by platform key update", providers=list(updates))

    return {"platform_config": users.get_platform_keys.execute()}


@router.get("/llm-config", summary="Obtener la configuración global de LLM")
def get_llm_config(_admin: None = Depends(require_admin)):
    """Modelos por tarea + cadena de fallback efectivos (semilla ⊕ admin)."""
    from llm.router import effective_llm_config
    from llm.utils.llm_config_store import CONFIG_TASKS

    return {
        "config": effective_llm_config(),
        "tasks": list(CONFIG_TASKS),
        "providers": list(TEXT_PROVIDERS),
    }


@router.put("/llm-config", summary="Actualizar la configuración global de LLM")
@limiter.limit("10/minute")
def put_llm_config(
    request: Request,
    payload: dict,
    admin: User = Depends(require_admin),
):
    """Persiste defaults/fallbacks por tarea (admin). Valida contra el catálogo;
    entradas inválidas se descartan en silencio (nunca rompe la generación).

    Si algo cambió, queda en el historial y la respuesta trae la entrada
    (`history_entry`) para ofrecer «Deshacer»."""
    result = apply_config(payload, admin, source="manual")
    return {
        "config": result["config"],
        "tasks": result["tasks"],
        "history_entry": result["history_entry"],
    }


@router.get("/registration-mode", summary="Obtener el modo de registro")
def get_registration_mode(
    _admin: None = Depends(require_admin),
    users: UsersUseCases = Depends(build_users),
):
    """Return the default role assigned to new self-registered users."""
    return {"default_registration_role": users.get_registration_mode.execute()}


@router.put("/registration-mode", summary="Actualizar el modo de registro")
@limiter.limit("10/minute")
def put_registration_mode(
    request: Request,
    payload: dict,
    _admin: None = Depends(require_admin),
    users: UsersUseCases = Depends(build_users),
):
    """Set the default role for new registrations (admin-only).

    Pass `{"default_registration_role": "usuarios_prueba"}` for tesis mode,
    or `{"default_registration_role": "usuario"}` to restore normal access.
    """
    role_name = users.save_registration_mode.execute(payload.get("default_registration_role"))
    return {"default_registration_role": role_name}


# Perfiles, historial y pruebas de modelo/proveedor: mismo prefijo `/api/admin`.
router.include_router(versions_router)
router.include_router(probe_router)
