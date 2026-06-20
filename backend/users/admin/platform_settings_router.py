"""Admin-only platform API key management.

Admins can set platform-level API keys that all users fall back to when they
haven't configured their own. Keys are stored in the platform_config table,
returned masked, and never logged.
"""

import logging

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


@router.get("/nodes-config")
def get_nodes_config_endpoint(
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Return node definitions + current configurable flags (admin-only)."""
    from prometheus.config.nodes_config import CAPABILITIES, NODES, get_nodes_config

    config = get_nodes_config()
    video_configured = bool(db.get(PlatformConfig, "video_api_key"))
    return {
        "nodes": NODES,
        "capabilities": CAPABILITIES,
        "config": config,
        "video_api_key_configured": video_configured,
    }


@router.put("/nodes-config")
@limiter.limit("10/minute")
def put_nodes_config_endpoint(
    request: Request,
    payload: dict,
    _admin: None = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Save configurable node flags (admin-only)."""
    from prometheus.config.nodes_config import CAPABILITIES, NODES, save_nodes_config

    VALID_FLAGS = {"ova_refine", "ova_critic", "ova_editor"}
    VALID_BOOL = {"0", "1"}
    updates: dict = {}
    for k, v in payload.items():
        if k in VALID_FLAGS:
            if str(v) not in VALID_BOOL:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Flag '{k}' debe ser '0' o '1'",
                )
            updates[k] = str(v)
        elif k == "ova_reflection_rounds":
            try:
                rounds = int(v)
                if not (0 <= rounds <= 3):
                    raise ValueError
                updates[k] = rounds
            except (ValueError, TypeError):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="ova_reflection_rounds debe ser entero 0-3",
                ) from None
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload vacío o sin flags reconocidos",
        )
    try:
        config = save_nodes_config(updates, db)
    except Exception:
        logger.exception("Nodes config write failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar la configuración de nodos.",
        ) from None
    video_configured = bool(db.get(PlatformConfig, "video_api_key"))
    return {
        "nodes": NODES,
        "capabilities": CAPABILITIES,
        "config": config,
        "video_api_key_configured": video_configured,
    }
