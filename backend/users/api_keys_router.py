"""Per-user provider API keys — masked GET, upsert/delete PUT.

Keys are stored plaintext in the user_api_keys JSONB column.
They are NEVER logged and always returned masked (last 4 chars visible).
An empty string value removes the key (falls back to platform/env key).
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from auth.dependencies import get_current_user
from core.database import get_db
from core.rate_limit import limiter
from llm.clients.key_resolver import PROVIDERS, mask_key
from models import User

router = APIRouter()
logger = logging.getLogger(__name__)

_MIN_KEY_LEN = 8


@router.get("/me/api-keys")
def get_api_keys(current_user: User = Depends(get_current_user)):
    """Return masked status for all configurable providers."""
    keys = current_user.user_api_keys or {}
    return {
        "api_keys": {p: mask_key(keys.get(p)) for p in PROVIDERS},
        "providers": list(PROVIDERS),
    }


@router.put("/me/api-keys")
@limiter.limit("10/minute")
def put_api_keys(
    request: Request,
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upsert or delete provider API keys.

    Pass `{provider: "key"}` to set, `{provider: ""}` to remove.
    Unknown providers are ignored.
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

    current_keys = dict(current_user.user_api_keys or {})
    for provider, value in updates.items():
        if value.strip():
            current_keys[provider] = value.strip()
        else:
            current_keys.pop(provider, None)

    current_user.user_api_keys = current_keys
    try:
        db.commit()
    except Exception:
        db.rollback()
        logger.exception("API keys write failed for user %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar las API keys. Intenta de nuevo.",
        ) from None

    saved = current_user.user_api_keys or {}
    return {"api_keys": {p: mask_key(saved.get(p)) for p in PROVIDERS}}
