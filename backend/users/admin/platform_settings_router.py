"""Admin-only platform API key management.

Admins can set platform-level API keys that all users fall back to when they
haven't configured their own. Keys are stored in the platform_config table,
returned masked, and never logged.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from auth.dependencies import require_admin
from database import get_db
from llm.key_resolver import PROVIDERS, mask_key
from models import PlatformConfig
from rate_limit import limiter

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
