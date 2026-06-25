"""Admin-only platform API key management.

Admins can set platform-level API keys that all users fall back to when they
haven't configured their own. Keys are stored in the platform_config table,
returned masked, and never logged.
"""

import logging
import threading

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from auth.dependencies import require_admin
from core.database import get_db
from core.rate_limit import limiter
from llm.clients.key_resolver import PROVIDERS, mask_key
from models import PlatformConfig

router = APIRouter()
logger = logging.getLogger(__name__)

_MIN_KEY_LEN = 8
_DB_KEY = "{}_api_key".format
_LLM_PROVIDERS = frozenset({"groq", "openrouter", "opencode"})


def _bg_catalog_refresh() -> None:
    """Re-fetch provider catalogs in background after a platform key change."""
    from core.database import SessionLocal
    from llm.catalog.catalog_refresh import refresh_catalog

    db = SessionLocal()
    try:
        refresh_catalog(db)
    finally:
        db.close()


def _load_platform_keys(db: Session) -> dict[str, str | None]:
    rows = {r.key: r.value for r in db.query(PlatformConfig).all()}
    return {p: rows.get(_DB_KEY(p)) for p in PROVIDERS}


@router.get("/platform-config")
def get_platform_config(
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Return masked platform API key status for all providers (admin-only)."""
    keys = _load_platform_keys(db)
    return {
        "platform_config": {p: mask_key(keys.get(p)) for p in PROVIDERS},
        "providers": list(PROVIDERS),
    }


@router.put("/platform-config")
@limiter.limit("10/minute")
def put_platform_config(
    request: Request,
    payload: dict,
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Upsert or delete platform API keys (admin-only).

    Pass `{provider: "key"}` to set, `{provider: ""}` to remove.
    """
    updates = {k: v for k, v in payload.items() if k in PROVIDERS and isinstance(v, str)}
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Payload must contain at least one key from: {', '.join(PROVIDERS)}",
        )

    for provider, value in updates.items():
        if value and len(value.strip()) < _MIN_KEY_LEN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La API key para '{provider}' es demasiado corta (mínimo {_MIN_KEY_LEN} caracteres).",
            )

    try:
        for provider, value in updates.items():
            db_key = _DB_KEY(provider)
            if value.strip():
                row = db.get(PlatformConfig, db_key)
                if row:
                    row.value = value.strip()
                else:
                    db.add(PlatformConfig(key=db_key, value=value.strip()))
            else:
                row = db.get(PlatformConfig, db_key)
                if row:
                    db.delete(row)
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("Platform config write failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar la configuración de plataforma.",
        ) from None

    if any(p in _LLM_PROVIDERS for p in updates):
        threading.Thread(target=_bg_catalog_refresh, daemon=True).start()
        logger.info("Catalog refresh triggered by platform key update: %s", list(updates))

    keys = _load_platform_keys(db)
    return {"platform_config": {p: mask_key(keys.get(p)) for p in PROVIDERS}}


@router.get("/llm-config")
def get_llm_config(_admin: None = Depends(require_admin)):
    """Modelos por tarea + cadena de fallback efectivos (semilla ⊕ admin)."""
    from llm.catalog.model_catalog import TASKS
    from llm.router import effective_llm_config
    from llm.utils import llm_config_store

    return {
        "config": effective_llm_config(),
        "tasks": list(TASKS),
        "providers": list(llm_config_store.PROVIDERS),
    }


@router.put("/llm-config")
@limiter.limit("10/minute")
def put_llm_config(
    request: Request,
    payload: dict,
    _admin: None = Depends(require_admin),
):
    """Persiste defaults/fallbacks por tarea (admin). Valida contra el catálogo;
    entradas inválidas se descartan en silencio (nunca rompe la generación)."""
    from llm.catalog.model_catalog import TASKS
    from llm.router import effective_llm_config
    from llm.utils import llm_config_store

    try:
        clean = llm_config_store.sanitize_config(payload)
        llm_config_store.save_stored(clean)
    except Exception:
        logger.exception("LLM model config write failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar la configuración de modelos.",
        ) from None

    return {"config": effective_llm_config(), "tasks": list(TASKS)}


@router.get("/registration-mode")
def get_registration_mode(
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Return the default role assigned to new self-registered users."""
    row = db.get(PlatformConfig, "default_registration_role")
    return {"default_registration_role": row.value if row else "usuarios_prueba"}


@router.put("/registration-mode")
@limiter.limit("10/minute")
def put_registration_mode(
    request: Request,
    payload: dict,
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Set the default role for new registrations (admin-only).

    Pass `{"default_registration_role": "usuarios_prueba"}` for tesis mode,
    or `{"default_registration_role": "usuario"}` to restore normal access.
    """
    role_name = (payload.get("default_registration_role") or "usuarios_prueba").strip()
    row = db.get(PlatformConfig, "default_registration_role")
    if row:
        row.value = role_name
    else:
        db.add(PlatformConfig(key="default_registration_role", value=role_name))
    db.commit()
    return {"default_registration_role": role_name}
